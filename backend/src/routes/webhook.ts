import { Router, Request, Response } from "express";
import crypto from "crypto";
import db from "../config/db";
import { randomUUID } from "crypto";
import { GITHUB_WEBHOOK_SECRET } from "../config/env";
import { parseSqlMigration, calculateOverallRisk, getLockingThreat } from "../services/schema-analyzer";
import { runCodebaseScan } from "../services/codebase-scanner";
import { generateRiskExplanation } from "../services/deepseek-agent";
import { orchestrateNotifications } from "../services/notification";

const router = Router();

function verifyGitHubSignature(req: Request): boolean {
  const secret = GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) return false;
  const body = JSON.stringify(req.body);
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

router.post("/webhook/github", async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;

    // Handle GitHub PING event (sent when webhook is first added)
    if (event === "ping") {
      console.log("🔔 Webhook ping received — webhook is active!");
      res.status(200).json({ message: "pong", hook: payload?.hook_id });
      return;
    }

    if (!verifyGitHubSignature(req)) { res.status(401).json({ error: "invalid signature" }); return; }

    if (event !== "pull_request" || !["opened", "synchronize"].includes(payload?.action)) {
      res.status(200).json({ message: "event ignored" }); return;
    }

    const prNumber = payload.number;
    const repoFullName = payload.repository?.full_name;
    const prUrl = payload.pull_request?.html_url;
    console.log(`🔔 Webhook: PR #${prNumber} from ${repoFullName}`);

    const files = payload.pull_request?.changed_files || [];
    const migrationFiles = files.filter(
      (f: any) => f.filename?.includes("/migrations/") || /V\d+__.*\.sql/.test(f.filename || ""),
    );
    if (migrationFiles.length === 0) { res.status(200).json({ message: "no migration files" }); return; }

    const repo = await db.get("SELECT project_id FROM registered_repos WHERE github_repo_url LIKE ?", `%${repoFullName}%`) as any;
    if (!repo) { res.status(200).json({ message: "repo not registered" }); return; }

    const projectId = repo.project_id;

    for (const file of migrationFiles) {
      const fileContent = await fetchFileFromGitHub(repoFullName, file.filename);
      if (!fileContent) continue;

      const detectedChanges = parseSqlMigration(fileContent);
      const overallRisk = calculateOverallRisk(detectedChanges);
      const migrationId = randomUUID();

      await db.run(
        "INSERT INTO migrations (id, project_id, pr_number, pr_url, github_repo_url, file_path, file_content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        migrationId, projectId, prNumber, prUrl, `https://github.com/${repoFullName}`, file.filename, fileContent, "analyzed",
      );

      for (const change of detectedChanges) {
        await db.run(
          "INSERT INTO schema_changes (id, migration_id, change_type, table_name, column_name, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
          randomUUID(), migrationId, change.changeType, change.tableName, change.columnName || null, change.riskLevel,
        );
      }

      const scanResult = await runCodebaseScan(projectId);
      console.log(`🔍 Scan: ${scanResult.totalMatches} matches in ${scanResult.affectedServices.length} services`);

      const explanation = await generateRiskExplanation(
        file.filename,
        detectedChanges.map((c) => ({ changeType: c.changeType, tableName: c.tableName, columnName: c.columnName, riskLevel: c.riskLevel })),
        scanResult.affectedServices.map((n) => ({ serviceName: n, filePaths: [] })),
      );

      await db.run(
        "INSERT INTO impact_reports (id, migration_id, overall_risk, affected_services, ai_explanation, ai_fix_steps) VALUES (?, ?, ?, ?, ?, ?)",
        randomUUID(), migrationId, overallRisk, JSON.stringify(scanResult.affectedServices),
        explanation.technicalExplanation || explanation.summary,
        (explanation.deployOrder || []).join("\n"),
      );

      const { githubSent, slackSent } = await orchestrateNotifications({
        migrationId, projectId, fileName: file.filename,
        changes: detectedChanges.map((c) => ({ changeType: c.changeType, table: c.tableName, column: c.columnName, risk: c.riskLevel })),
        overallRisk, prNumber, repoFullName,
        affectedServices: (explanation.affectedServiceFixes || []).map((f: any) => ({ serviceName: f.serviceName || "unknown", filePath: "", issue: f.issue || "", fix: f.fix || "" })),
        deployOrder: explanation.deployOrder || [],
        dashboardUrl: process.env.DASHBOARD_URL ? `${process.env.DASHBOARD_URL}/migrations/${migrationId}` : "",
      });

      await db.run("UPDATE impact_reports SET posted_to_github = ?, posted_to_slack = ? WHERE migration_id = ?",
        githubSent ? 1 : 0, slackSent ? 1 : 0, migrationId);

      console.log(`✅ Pipeline complete for ${migrationId}`);
    }

    res.status(200).json({ message: "webhook processed", migrationsAnalyzed: migrationFiles.length });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "webhook processing failed" });
  }
});

async function fetchFileFromGitHub(repoFullName: string, filePath: string): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.log("⚠️ No GITHUB_TOKEN — using simulated content");
    return `-- Simulated ${filePath}\nALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';`;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}`,
      { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data: any = await res.json();
    return Buffer.from(data.content, "base64").toString("utf-8");
  } catch { return null; }
}

export default router;
