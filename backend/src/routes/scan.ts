import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { randomUUID } from "crypto";
import { cloneRepo } from "../services/git-manager";
import { scanRepository, CodeMatch } from "../services/tree-scanner";
import { generateRiskExplanation } from "../services/deepseek-agent";
import { eventBus, TOPICS } from "../services/event-bus";
import { workflowEngine } from "../services/workflow-engine";
import { getTableStats } from "../services/db-inspector";
import { parseSqlMigration, calculateOverallRisk, getLockingThreat } from "../services/schema-analyzer";

const router = Router();
const scanResultsCache = new Map<string, any>();

router.post("/scan/project/:id", authMiddleware, async (req: Request, res: Response) => {
  const projectId = req.params.id;
  const tenantId = req.user!.tenantId;

  const project = await db.get(
    "SELECT * FROM projects WHERE id = ? AND tenant_id = ?", projectId, tenantId,
  ) as any;

  if (!project) { res.status(404).json({ error: "project not found" }); return; }

  console.log(`🚀 Starting full scan pipeline for project: ${project.name}`);
  res.json({ message: "scan pipeline started", projectId, status: "running" });
  void executeScanPipeline(projectId, project.name);
});

router.get("/scan/status/:projectId", authMiddleware, (req: Request, res: Response) => {
  res.json(scanResultsCache.get(req.params.projectId) || { status: "not_started" });
});

router.post("/scan/parse-sql", authMiddleware, (req: Request, res: Response) => {
  const { sql, fileName } = req.body;
  if (!sql) { res.status(400).json({ error: "sql content required" }); return; }
  const changes = parseSqlMigration(sql);
  res.json({ fileName: fileName || "unknown", changes, overallRisk: calculateOverallRisk(changes), lockingThreat: getLockingThreat(changes), changeCount: changes.length });
});

router.get("/scan/db-stats/:tableName", authMiddleware, async (req: Request, res: Response) => {
  res.json(await getTableStats(req.params.tableName));
});

async function executeScanPipeline(projectId: string, projectName: string): Promise<void> {
  const scanId = randomUUID();
  scanResultsCache.set(projectId, { status: "running", scanId, startedAt: new Date().toISOString() });

  try {
    const repos = await db.all(
      "SELECT id, github_repo_url as url, service_name as name, primary_language as language FROM registered_repos WHERE project_id = ?",
      projectId,
    ) as Array<{ id: string; url: string; name: string; language: string }>;

    if (repos.length === 0) {
      scanResultsCache.set(projectId, { status: "completed", message: "No repos to scan" });
      return;
    }

    const migrations = await db.all(
      "SELECT * FROM migrations WHERE project_id = ? ORDER BY created_at DESC LIMIT 10",
      projectId,
    ) as Array<any>;

    const tableNames = new Set<string>();
    for (const m of migrations) {
      const changes = await db.all("SELECT table_name, column_name FROM schema_changes WHERE migration_id = ?", m.id) as Array<any>;
      for (const c of changes) { if (c.table_name) tableNames.add(c.table_name); }
    }

    console.log(`🎯 Scanning for tables: ${Array.from(tableNames).join(", ") || "all"}`);

    await workflowEngine.execute(`scan-${projectName}`, [
      {
        name: "cloneRepos",
        fn: async () => {
          const cloned: Array<{ repo: any; matches: CodeMatch[] }> = [];
          for (const repo of repos) {
            const repoInfo = await cloneRepo(repo);
            const matches = await scanRepository(repoInfo.localPath, repoInfo.language);
            cloned.push({ repo: repoInfo, matches });
            console.log(`  📁 ${repo.name}: ${matches.length} refs found`);
          }
          return cloned;
        },
        timeout: 300000, retries: 1,
      },
      {
        name: "saveDependencyGraph",
        fn: async (prevResults) => {
          const cloned = (prevResults.cloneRepos || []) as Array<{ repo: any; matches: CodeMatch[] }>;
          let totalSaved = 0;
          await db.run("DELETE FROM dependency_graph WHERE project_id = ?", projectId);
          for (const { repo, matches } of cloned) {
            for (const match of matches) {
              await db.run(
                `INSERT INTO dependency_graph (id, project_id, repo_id, table_name, column_name, file_path, line_number, usage_type, code_snippet, is_dynamic, confidence)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                randomUUID(), projectId, repo.id, match.tableName, match.columnName || null,
                match.filePath, match.lineNumber, match.usageType, match.codeSnippet, 0, match.confidence,
              );
              totalSaved++;
            }
          }
          return { totalSaved, repos: cloned.length };
        },
        timeout: 30000,
      },
      {
        name: "aiAnalysis",
        fn: async (prevResults) => {
          const cloned = (prevResults.cloneRepos || []) as Array<{ repo: any; matches: CodeMatch[] }>;
          for (const m of migrations) {
            const changes = await db.all("SELECT * FROM schema_changes WHERE migration_id = ?", m.id) as Array<any>;
            if (changes.length === 0) continue;

            const affectedServices: Array<{ serviceName: string; filePaths: string[] }> = [];
            for (const { repo, matches } of cloned) {
              const relevant = matches.filter((m2) => changes.some((c: any) => c.table_name === m2.tableName));
              if (relevant.length > 0) affectedServices.push({ serviceName: repo.name, filePaths: relevant.map((ma) => ma.filePath) });
            }

            const explanation = await generateRiskExplanation(
              m.file_path || "unknown",
              changes.map((c: any) => ({ changeType: c.change_type, tableName: c.table_name, columnName: c.column_name, riskLevel: c.risk_level })),
              affectedServices,
            );

            await db.run(
              `INSERT INTO impact_reports (id, migration_id, overall_risk, affected_services, ai_explanation, ai_fix_steps)
               VALUES (?, ?, ?, ?, ?, ?)`,
              randomUUID(), m.id, explanation.estimatedRisk,
              JSON.stringify(affectedServices.map((s) => s.serviceName)),
              explanation.technicalExplanation || explanation.summary,
              (explanation.deployOrder || []).join("\n"),
            );
          }
          return { reportsGenerated: migrations.length };
        },
        timeout: 60000,
      },
      {
        name: "publishEvents",
        fn: async (prevResults) => {
          const depCount = (prevResults.saveDependencyGraph as any)?.totalSaved || 0;
          eventBus.publish(TOPICS.SCAN_COMPLETE, { projectId, matchCount: depCount });
          eventBus.publish(TOPICS.AI_ANALYSIS_COMPLETE, { projectId, reportsGenerated: migrations.length });
          await db.run("UPDATE registered_repos SET last_scanned_at = ? WHERE project_id = ?", new Date().toISOString(), projectId);
          scanResultsCache.set(projectId, { status: "completed", scanId, completedAt: new Date().toISOString(), repos: repos.length, dependencies: depCount, reports: migrations.length });
          return { eventsPublished: 2 };
        },
        timeout: 10000,
      },
    ], async (err, step) => {
      scanResultsCache.set(projectId, { status: "failed", error: err.message, failedStep: step });
    });

  } catch (err: any) {
    scanResultsCache.set(projectId, { status: "failed", error: err.message });
  }
}

export default router;
