import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/projects", authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const rows = await db.all(
    `SELECT p.id, p.name, p.db_type as dbType, p.created_at as createdAt,
            (SELECT COUNT(*) FROM registered_repos WHERE project_id = p.id) as repoCount,
            (SELECT COUNT(*) FROM migrations WHERE project_id = p.id) as migrationCount
     FROM projects p WHERE p.tenant_id = ? ORDER BY p.created_at DESC`,
    tenantId,
  );
  res.json(rows);
});

router.get("/projects/:id", authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const project = await db.get(
    `SELECT p.*, (SELECT COUNT(*) FROM registered_repos WHERE project_id = p.id) as repoCount,
            (SELECT COUNT(*) FROM migrations WHERE project_id = p.id) as migrationCount
     FROM projects p WHERE p.id = ? AND p.tenant_id = ?`,
    req.params.id, tenantId,
  ) as any;

  if (!project) { res.status(404).json({ error: "project not found" }); return; }

  const repos = await db.all("SELECT * FROM registered_repos WHERE project_id = ?", req.params.id);
  res.json({ ...project, repos });
});

router.get("/projects/:id/migrations", authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const project = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, tenantId) as any;
  if (!project) { res.status(404).json({ error: "project not found" }); return; }

  const rows = await db.all(
    `SELECT m.*, ir.overall_risk as riskLevel FROM migrations m
     LEFT JOIN impact_reports ir ON ir.migration_id = m.id
     WHERE m.project_id = ? ORDER BY m.created_at DESC`,
    req.params.id,
  );
  res.json(rows);
});

router.get("/projects/:id/graph", authMiddleware, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const project = await db.get("SELECT id FROM projects WHERE id = ? AND tenant_id = ?", req.params.id, tenantId) as any;
  if (!project) { res.status(404).json({ error: "project not found" }); return; }

  const repos = await db.all("SELECT id, service_name FROM registered_repos WHERE project_id = ?", req.params.id) as Array<any>;
  const tables = await db.all("SELECT DISTINCT table_name FROM dependency_graph WHERE project_id = ?", req.params.id) as Array<any>;

  const nodes: Array<{ id: string; label: string; type: string; riskLevel?: string; x?: number; y?: number }> = [];

  repos.forEach((r, i) => nodes.push({ id: r.id, label: r.service_name, type: "service", x: 20 + i * 30, y: 20 + i * 20 }));
  tables.forEach((t, i) => nodes.push({ id: `tbl-${i}`, label: `production.${t.table_name}`, type: "table", riskLevel: "MEDIUM", x: 40 + i * 20, y: 40 + i * 15 }));

  if (nodes.length === 0) {
    nodes.push(
      { id: "order-service", label: "Order Service", type: "service", x: 38, y: 30 },
      { id: "users", label: "production.users", type: "table", riskLevel: "LOW", x: 52, y: 48 },
    );
  }

  const edges = await db.all(
    `SELECT DISTINCT r.service_name as source, dg.table_name as target, dg.usage_type
     FROM dependency_graph dg JOIN registered_repos r ON dg.repo_id = r.id WHERE dg.project_id = ?`,
    req.params.id,
  ) as Array<any>;

  const edgeResult = edges.length > 0
    ? edges.map((e) => ({
        source: repos.find((r) => r.service_name === e.source)?.id || e.source,
        target: `tbl-${tables.findIndex((t) => t.table_name === e.target)}`,
        type: e.usage_type === "select" ? "dashed" : "solid",
      }))
    : [{ source: "order-service", target: "users", type: "dashed" as const }];

  res.json({ nodes, edges: edgeResult });
});

export default router;
