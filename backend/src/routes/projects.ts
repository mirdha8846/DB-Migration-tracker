import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { randomUUID } from "crypto";
import { getBackendUrl, getWebhookSecret } from "../services/github-webhook-setup";

const router = Router();

router.get("/projects", authMiddleware, async (req: Request, res: Response) => {
  const rows = await db.all(
    `SELECT p.id, p.name, p.db_type as "dbType", p.created_at as "createdAt",
            (SELECT COUNT(*) FROM registered_repos WHERE project_id = p.id) as repoCount,
            (SELECT COUNT(*) FROM migrations WHERE project_id = p.id) as migrationCount
     FROM projects p WHERE p.tenant_id = ? ORDER BY p.created_at DESC`,
    req.user!.tenantId,
  );
  res.json(rows);
});

router.post("/projects", authMiddleware, async (req: Request, res: Response) => {
  const { name, dbType } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const id = randomUUID();
  await db.run("INSERT INTO projects (id, tenant_id, name, db_type, created_by) VALUES (?, ?, ?, ?, ?)",
    id, req.user!.tenantId, name, dbType || "postgres", req.user!.userId);
  res.status(201).json(await db.get("SELECT * FROM projects WHERE id = ?", id));
});

router.get("/projects/:id/repos", authMiddleware, async (req: Request, res: Response) => {
  const p = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, req.user!.tenantId) as any;
  if (!p) { res.status(404).json({ error: "project not found" }); return; }
  res.json(await db.all("SELECT * FROM registered_repos WHERE project_id = ?", req.params.id));
});

router.post("/projects/:id/repos", authMiddleware, async (req: Request, res: Response) => {
  const p = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, req.user!.tenantId) as any;
  if (!p) { res.status(404).json({ error: "project not found" }); return; }
  const { githubRepoUrl, serviceName, language } = req.body;
  if (!githubRepoUrl || !serviceName) { res.status(400).json({ error: "githubRepoUrl and serviceName required" }); return; }

  const id = randomUUID();
  await db.run("INSERT INTO registered_repos (id, project_id, github_repo_url, service_name, primary_language) VALUES (?, ?, ?, ?, ?)",
    id, req.params.id, githubRepoUrl, serviceName, language || "java");

  const row = await db.get("SELECT * FROM registered_repos WHERE id = ?", id);
  console.log(`📁 Repo registered: ${serviceName}`);
  res.status(201).json(row);
});

router.get("/projects/:id/migrations", authMiddleware, async (req: Request, res: Response) => {
  const p = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, req.user!.tenantId) as any;
  if (!p) { res.status(404).json({ error: "project not found" }); return; }
  res.json(await db.all(
    `SELECT m.*, ir.overall_risk as riskLevel FROM migrations m
     LEFT JOIN impact_reports ir ON ir.migration_id = m.id WHERE m.project_id = ? ORDER BY m.created_at DESC`,
    req.params.id));
});

// Webhook setup instructions — no PAT needed
router.get("/projects/:id/webhook-info", authMiddleware, (_req: Request, res: Response) => {
  const backendUrl = getBackendUrl();
  const webhookSecret = getWebhookSecret();
  res.json({
    webhookUrl: backendUrl ? `${backendUrl}/webhook/github` : null,
    webhookSecret,
    configured: !!backendUrl,
    manualSetupSteps: backendUrl ? [
      { step: 1, text: "Go to GitHub repo → Settings → Webhooks → Add webhook" },
      { step: 2, text: "Payload URL", value: `${backendUrl}/webhook/github`, copy: true },
      { step: 3, text: "Content type", value: "application/json" },
      { step: 4, text: "Secret", value: webhookSecret, copy: true },
      { step: 5, text: "Which events?", value: "Pull requests" },
      { step: 6, text: "Click Add webhook" },
    ] : [],
  });
});

router.get("/projects/:id/graph", authMiddleware, async (req: Request, res: Response) => {
  const p = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, req.user!.tenantId) as any;
  if (!p) { res.status(404).json({ error: "project not found" }); return; }

  const repos = await db.all("SELECT id, service_name FROM registered_repos WHERE project_id = ?", req.params.id) as Array<any>;
  const tables = await db.all("SELECT DISTINCT table_name FROM dependency_graph WHERE project_id = ?", req.params.id) as Array<any>;
  const nodes: Array<any> = [];
  repos.forEach((r, i) => nodes.push({ id: r.id, label: r.service_name, type: "service", x: 20 + i * 30, y: 20 + i * 20 }));
  tables.forEach((t, i) => nodes.push({ id: `tbl-${i}`, label: `production.${t.table_name}`, type: "table", riskLevel: "MEDIUM", x: 40 + i * 20, y: 40 + i * 15 }));

  if (nodes.length === 0) return res.json({ nodes: [{ id: "empty", label: "No data yet", type: "service", x: 50, y: 50 }], edges: [] });

  const edges = await db.all(
    `SELECT DISTINCT r.service_name as source, dg.table_name as target, dg.usage_type
     FROM dependency_graph dg JOIN registered_repos r ON dg.repo_id = r.id WHERE dg.project_id = ?`,
    req.params.id) as Array<any>;
  res.json({
    nodes,
    edges: edges.map((e) => ({ source: repos.find((r) => r.service_name === e.source)?.id || e.source, target: `tbl-${tables.findIndex((t) => t.table_name === e.target)}`, type: (e.usage_type === "select" ? "dashed" : "solid") as "dashed" | "solid" })),
  });
});

router.get("/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const project = await db.get(
    `SELECT p.*, (SELECT COUNT(*) FROM registered_repos WHERE project_id = p.id) as repoCount,
            (SELECT COUNT(*) FROM migrations WHERE project_id = p.id) as migrationCount
     FROM projects p WHERE p.id = ? AND p.tenant_id = ?`, req.params.id, req.user!.tenantId) as any;
  if (!project) { res.status(404).json({ error: "project not found" }); return; }
  project.repos = await db.all("SELECT * FROM registered_repos WHERE project_id = ?", req.params.id);
  res.json(project);
});

export default router;

function extractRepoFullName(url: string): string | null {
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}
