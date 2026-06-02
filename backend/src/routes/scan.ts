import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { randomUUID } from "crypto";
import { cloneRepo, cleanupProject } from "../services/git-manager";
import { scanRepositoryTreeSitter, AstMatch } from "../services/tree-ast-scanner";
import { generateRiskExplanation } from "../services/deepseek-agent";
import { eventBus, TOPICS } from "../services/event-bus";
import { workflowEngine } from "../services/workflow-engine";
import { getTableStats } from "../services/db-inspector";
import { analyzeMigration, SmartAnalysis } from "../services/smart-migration-analyzer";

const router = Router();
const scanResultsCache = new Map<string, any>();

router.post("/scan/project/:id", authMiddleware, async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const tenantId = req.user!.tenantId;
  const project = await db.get("SELECT * FROM projects WHERE id = ? AND tenant_id = ?", projectId, tenantId) as any;
  if (!project) { res.status(404).json({ error: "project not found" }); return; }

  console.log(`🚀 Starting scan pipeline: ${project.name}`);
  res.json({ message: "scan started", projectId, status: "running" });
  void runScanPipeline(projectId, project.name);
});

router.get("/scan/status/:projectId", authMiddleware, (req: Request, res: Response) => {
  res.json(scanResultsCache.get(req.params.projectId) || { status: "not_started" });
});

router.post("/scan/parse-sql", authMiddleware, async (req: Request, res: Response) => {
  const { sql, fileName, projectId } = req.body;
  if (!sql) { res.status(400).json({ error: "sql content required" }); return; }

  try {
    const analysis = await analyzeMigration(sql, fileName || "unknown.sql", projectId || "");
    console.log(`🧠 Smart analysis: ${analysis.parsedChanges.length} changes, risk=${analysis.overallRisk}, score=${analysis.riskScore}`);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/scan/db-stats/:tableName", authMiddleware, async (req: Request, res: Response) => {
  res.json(await getTableStats(req.params.tableName));
});

async function runScanPipeline(projectId: string, projectName: string): Promise<void> {
  const scanId = randomUUID();
  scanResultsCache.set(projectId, { status: "running", scanId, startedAt: new Date().toISOString() });

  try {
    const repos = await db.all(
      "SELECT id, github_repo_url as url, service_name as name, primary_language as language FROM registered_repos WHERE project_id = ?",
      projectId,
    ) as Array<{ id: string; url: string; name: string; language: string }>;

    if (repos.length === 0) {
      scanResultsCache.set(projectId, { status: "completed", message: "No repos registered" });
      return;
    }

    const migrations = await db.all("SELECT * FROM migrations WHERE project_id = ? ORDER BY created_at DESC LIMIT 10", projectId) as Array<any>;

    const tableNames = new Set<string>();
    for (const m of migrations) {
      const changes = await db.all("SELECT table_name FROM schema_changes WHERE migration_id = ?", m.id) as Array<any>;
      for (const c of changes) { if (c.table_name) tableNames.add(c.table_name); }
    }

    console.log(`🎯 Scanning tables: ${Array.from(tableNames).join(", ") || "all"}`);
    console.log(`🌳 Using Tree-sitter AST scanner`);

    await workflowEngine.execute(`scan-${projectName}`, [
      {
        name: "cloneAndScan",
        fn: async () => {
          let total = 0;
          const allMatches: Array<{ repo: any; matches: AstMatch[] }> = [];

          for (const repo of repos) {
            const repoInfo = await cloneRepo(repo);
            if (!repoInfo.cloned) continue;

            const matches = await scanRepositoryTreeSitter(repoInfo.localPath, repoInfo.language);
            allMatches.push({ repo: repoInfo, matches });
            total += matches.length;
            console.log(`  🌳 ${repo.name}: ${matches.length} refs (tree-sitter)`);
          }

          return { totalMatches: total, repoResults: allMatches };
        },
        timeout: 300000,
        retries: 1,
      },
      {
        name: "saveDependencies",
        fn: async (prevResults) => {
          const data = prevResults.cloneAndScan as { totalMatches: number; repoResults: Array<{ repo: any; matches: AstMatch[] }> };
          await db.run("DELETE FROM dependency_graph WHERE project_id = ?", projectId);
          let total = 0;

          for (const { repo, matches } of data.repoResults) {
            for (const match of matches) {
              if (!match.tableName || match.tableName === "unknown_table") continue;
              await db.run(
                `INSERT INTO dependency_graph (id, project_id, repo_id, table_name, column_name, file_path, line_number, usage_type, code_snippet, is_dynamic, confidence)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                randomUUID(), projectId, repo.id, match.tableName, match.columnName || null,
                match.filePath, match.lineNumber, match.usageType, match.codeSnippet, 0, match.confidence,
              );
              total++;
            }
          }
          return { saved: total };
        },
        timeout: 30000,
      },
      {
        name: "aiAnalysis",
        fn: async (prevResults) => {
          const data = prevResults.cloneAndScan as { repoResults: Array<{ repo: any; matches: AstMatch[] }> };
          for (const m of migrations) {
            const changes = await db.all("SELECT * FROM schema_changes WHERE migration_id = ?", m.id) as Array<any>;
            if (changes.length === 0) continue;

            const affectedServices: Array<{ serviceName: string; filePaths: string[] }> = [];
            for (const { repo, matches } of data.repoResults) {
              const relevant = matches.filter((match) => changes.some((c: any) => c.table_name === match.tableName));
              if (relevant.length > 0) affectedServices.push({ serviceName: repo.name, filePaths: [...new Set(relevant.map((ma) => ma.filePath))] });
            }

            const explanation = await generateRiskExplanation(
              m.file_path || "unknown",
              changes.map((c: any) => ({ changeType: c.change_type, tableName: c.table_name, columnName: c.column_name, riskLevel: c.risk_level })),
              affectedServices,
            );

            await db.run(
              "INSERT INTO impact_reports (id, migration_id, overall_risk, affected_services, ai_explanation, ai_fix_steps) VALUES (?, ?, ?, ?, ?, ?)",
              randomUUID(), m.id, explanation.estimatedRisk,
              JSON.stringify(affectedServices.map((s) => s.serviceName)),
              explanation.technicalExplanation || explanation.summary,
              (explanation.deployOrder || []).join("\n"),
            );
          }
          return { reports: migrations.length };
        },
        timeout: 90000,
      },
      {
        name: "cleanup",
        fn: async (prevResults) => {
          // Remove cloned repos to save disk space
          cleanupProject(projectId);

          const saved = (prevResults.saveDependencies as any)?.saved || 0;
          eventBus.publish(TOPICS.SCAN_COMPLETE, { projectId, matchCount: saved });
          eventBus.publish(TOPICS.AI_ANALYSIS_COMPLETE, { projectId });

          await db.run("UPDATE registered_repos SET last_scanned_at = ? WHERE project_id = ?", new Date().toISOString(), projectId);

          scanResultsCache.set(projectId, { status: "completed", scanId, completedAt: new Date().toISOString(), repos: repos.length, dependencies: saved, reports: migrations.length });
          return { cleaned: true };
        },
        timeout: 30000,
      },
    ], async (err, step) => {
      scanResultsCache.set(projectId, { status: "failed", error: err.message, step });
    });

    console.log(`✅ Pipeline complete: ${projectName}`);
  } catch (err: any) {
    scanResultsCache.set(projectId, { status: "failed", error: err.message });
    console.error("Pipeline error:", err.message);
  }
}

export default router;
