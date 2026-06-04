import { Router, Request, Response } from "express";
import crypto from "crypto";
import db from "../config/db";
import { randomUUID } from "crypto";
import { GITHUB_WEBHOOK_SECRET } from "../config/env";
import { parseSqlMigration, calculateOverallRisk } from "../services/schema-analyzer";
import { runCodebaseScan } from "../services/codebase-scanner";
import { generateRiskExplanation } from "../services/deepseek-agent";
import { orchestrateNotifications } from "../services/notification";

const router = Router();

function verifyGitHubSignature(req: Request): boolean {
  const secret = GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  const signature = req.headers["x-hub-signature-256"] as string;
  if (!signature) return false;
  const rawBody = (req as any).rawBody as Buffer;
  if (!rawBody) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

router.post("/webhook/github", async (req: Request, res: Response) => {
  try {
    const event = req.headers["x-github-event"] as string;
    const payload = req.body;

    if (event === "ping") {
      console.log("🔔 Webhook ping — active!");
      res.status(200).json({ message: "pong" });
      return;
    }

    if (!verifyGitHubSignature(req)) {
      console.log("❌ Invalid signature");
      res.status(401).json({ error: "invalid signature" });
      return;
    }

    if (event !== "pull_request" || !["opened", "synchronize"].includes(payload?.action)) {
      res.status(200).json({ message: "event ignored" });
      return;
    }

    const prNumber = payload.number;
    const repoFullName = payload.repository?.full_name;
    const prUrl = payload.pull_request?.html_url;
    const branch = payload.pull_request?.head?.ref;
    console.log(`🔔 Webhook: PR #${prNumber} from ${repoFullName} (branch: ${branch})`);

    // Find migration files
    const rawFiles = payload.pull_request?.changed_files;
    const files: Array<{ filename: string }> = Array.isArray(rawFiles) ? rawFiles : [];
    const migrationFiles = files.filter(
      (f) => f.filename?.endsWith(".sql") || f.filename?.includes("/migrations/") || /V\d+__.*\.sql/i.test(f.filename || ""),
    );

    // If no files in webhook payload, fetch from GitHub
    if (migrationFiles.length === 0 && repoFullName) {
      let apiFiles = await fetchPrFilesFromGitHub(repoFullName, prNumber);
      if (apiFiles.length === 0 && prUrl) {
        apiFiles = await fetchPrDiffFiles(prUrl);
      }
      apiFiles = apiFiles.filter((f) =>
        f.filename?.endsWith(".sql") || f.filename?.includes("/migrations/") || /V\d+__.*\.sql/i.test(f.filename || ""),
      );
      migrationFiles.push(...apiFiles);
    }

    if (migrationFiles.length === 0) {
      console.log("📋 No SQL migration files in this PR");
      res.status(200).json({ message: "no migration files in PR" });
      return;
    }

    console.log(`📋 Found ${migrationFiles.length} SQL file(s)`);

    // Match repo to project
    const repo = await db.get(
      `SELECT project_id FROM registered_repos 
       WHERE github_repo_url LIKE ? OR github_repo_url LIKE ? OR github_repo_url LIKE ?`,
      `%${repoFullName}%`, `%${repoFullName}.git%`, `%github.com/${repoFullName}%`,
    ) as any;
    if (!repo) { res.status(200).json({ message: "repo not registered" }); return; }

    const projectId = repo.project_id;
    let totalMigrated = 0;

    for (const file of migrationFiles) {
      // Fetch file content
      const fileContent = await fetchFileFromGitHub(repoFullName, file.filename, branch);

      if (!fileContent) {
        console.log(`⚠️ Could not fetch: ${file.filename}`);
        continue;
      }

      // Parse SQL
      const detectedChanges = parseSqlMigration(fileContent);

      if (detectedChanges.length === 0) {
        console.log(`⚠️ No SQL patterns detected in: ${file.filename} (${fileContent.length} bytes)`);
        console.log(`   Preview: ${fileContent.substring(0, 150).replace(/\n/g, " ")}`);
        continue;
      }

      console.log(`📊 ${file.filename}: ${detectedChanges.length} changes detected`);

      const overallRisk = calculateOverallRisk(detectedChanges);
      const migrationId = randomUUID();

      // Save migration + schema changes
      await db.run(
        "INSERT INTO migrations (id, project_id, pr_number, pr_url, github_repo_url, file_path, file_content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        migrationId, projectId, prNumber, prUrl || "", `https://github.com/${repoFullName}`, file.filename, fileContent, "analyzed",
      );

      for (const change of detectedChanges) {
        await db.run(
          "INSERT INTO schema_changes (id, migration_id, change_type, table_name, column_name, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
          randomUUID(), migrationId, change.changeType, change.tableName, change.columnName || null, change.riskLevel,
        );
      }

      // Run codebase scan (non-blocking, errors logged not thrown)
      let scanResult = { totalMatches: 0, affectedServices: [] as string[] };
      try {
        scanResult = await runCodebaseScan(projectId);
        console.log(`🔍 Scan: ${scanResult.totalMatches} matches in ${scanResult.affectedServices.length} services`);
      } catch (err: any) {
        console.log(`🔍 Scan skipped: ${err.message}`);
      }

      // AI explanation (non-blocking)
      let aiExplanation = "";
      let aiFixSteps = "";
      try {
        const explanation = await generateRiskExplanation(
          file.filename,
          detectedChanges.map((c) => ({ changeType: c.changeType, tableName: c.tableName, columnName: c.columnName, riskLevel: c.riskLevel })),
          scanResult.affectedServices.map((n) => ({ serviceName: n, filePaths: [] })),
        );
        aiExplanation = explanation.technicalExplanation || explanation.summary;
        aiFixSteps = (explanation.deployOrder || []).join("\n");
      } catch (err: any) {
        console.log(`🤖 AI skipped: ${err.message}`);
      }

      // Save impact report
      await db.run(
        "INSERT INTO impact_reports (id, migration_id, overall_risk, affected_services, ai_explanation, ai_fix_steps) VALUES (?, ?, ?, ?, ?, ?)",
        randomUUID(), migrationId, overallRisk, JSON.stringify(scanResult.affectedServices), aiExplanation, aiFixSteps,
      );

      // Send notifications (non-blocking, errors logged not thrown)
      try {
        if (process.env.GITHUB_TOKEN) {
          await orchestrateNotifications({
            migrationId, projectId, fileName: file.filename,
            changes: detectedChanges.map((c) => ({ changeType: c.changeType, table: c.tableName, column: c.columnName, risk: c.riskLevel })),
            overallRisk, prNumber, repoFullName,
            affectedServices: scanResult.affectedServices.map((s) => ({ serviceName: s, filePath: "", issue: "", fix: "" })),
            deployOrder: aiFixSteps ? aiFixSteps.split("\n").filter(Boolean) : [],
            dashboardUrl: process.env.DASHBOARD_URL || "",
          });
        }
      } catch (err: any) {
        console.log(`📋 Notification skipped: ${err.message}`);
      }

      totalMigrated++;
    }

    console.log(`✅ Pipeline done: ${totalMigrated}/${migrationFiles.length} migrations created`);
    res.status(200).json({
      message: "webhook processed",
      filesFound: migrationFiles.length,
      migrationsCreated: totalMigrated,
    });
  } catch (err: any) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: "webhook processing failed" });
  }
});

async function fetchPrDiffFiles(prUrl: string): Promise<Array<{ filename: string }>> {
  try {
    const diffUrl = prUrl.replace(/\/pull\/(\d+).*/, "/pull/$1.diff");
    const res = await fetch(diffUrl);
    if (!res.ok) return [];
    const diff = await res.text();
    const files: Array<{ filename: string }> = [];
    const re = /^diff --git a\/(.+?) b\/(.+?)$/gm;
    let match;
    while ((match = re.exec(diff)) !== null) files.push({ filename: match[1] });
    console.log(`📁 PR diff: ${files.length} files found`);
    return files;
  } catch { return []; }
}

async function fetchPrFilesFromGitHub(repo: string, pr: number): Promise<Array<{ filename: string }>> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${pr}/files`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (Array.isArray(data) ? data : []).filter((f: any) => f.filename).map((f: any) => ({ filename: f.filename }));
  } catch { return []; }
}

async function fetchFileFromGitHub(repoFullName: string, filePath: string, branch?: string): Promise<string | null> {
  // Method 1: GitHub API (needs token for private repos)
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    try {
      const ref = branch ? `?ref=${branch}` : "";
      const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}${ref}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: any = await res.json();
        if (data.content) return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch { /* try next */ }
  }

  // Method 2: raw.githubusercontent.com with PR branch
  if (branch) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${repoFullName}/${branch}/${filePath}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`✅ Fetched ${filePath} from branch ${branch} (${text.length} bytes)`);
        return text;
      }
    } catch { }
  }

  // Method 3: raw.githubusercontent.com with main/master
  for (const b of ["main", "master"]) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${repoFullName}/${b}/${filePath}`);
      if (res.ok) {
        const text = await res.text();
        console.log(`✅ Fetched ${filePath} from ${b} (${text.length} bytes)`);
        return text;
      }
    } catch { }
  }

  console.log(`⚠️ All fetch methods failed for: ${repoFullName}/${filePath} (branch: ${branch || "main"})`);
  return null;
}

export default router;
