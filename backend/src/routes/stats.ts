import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get("/stats/overview", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const tenantId = _req.user!.tenantId;

    const migrationRow = await db.get(
      "SELECT COUNT(*) as count FROM migrations m JOIN projects p ON m.project_id = p.id WHERE p.tenant_id = ?",
      tenantId,
    ) as { count: number };
    const totalMigrations = migrationRow?.count || 0;

    const serviceRow = await db.get(
      "SELECT COUNT(*) as count FROM registered_repos r JOIN projects p ON r.project_id = p.id WHERE p.tenant_id = ?",
      tenantId,
    ) as { count: number };
    const affectedServices = serviceRow?.count || 0;

    const projectRow = await db.get(
      "SELECT COUNT(*) as count FROM projects WHERE tenant_id = ?",
      tenantId,
    ) as { count: number };
    const activeProjects = projectRow?.count || 0;

    const criticalRow = await db.get(
      `SELECT COUNT(*) as count FROM schema_changes sc
       JOIN migrations m ON sc.migration_id = m.id
       JOIN projects p ON m.project_id = p.id
       WHERE p.tenant_id = ? AND sc.risk_level = 'critical'`,
      tenantId,
    ) as { count: number };

    const isSqlite = !db.isPostgres();
    const weekExpr = isSqlite ? "strftime('%Y-W%W', m.created_at)" : "TO_CHAR(m.created_at, 'YYYY-WW')";

    const weeks = await db.all(
      `SELECT ${weekExpr} as week,
              SUM(CASE WHEN sc.risk_level = 'low' THEN 1 ELSE 0 END) as low,
              SUM(CASE WHEN sc.risk_level = 'medium' THEN 1 ELSE 0 END) as medium,
              SUM(CASE WHEN sc.risk_level = 'high' THEN 1 ELSE 0 END) as high,
              SUM(CASE WHEN sc.risk_level = 'critical' THEN 1 ELSE 0 END) as critical
       FROM migrations m
       JOIN projects p ON m.project_id = p.id
       LEFT JOIN schema_changes sc ON sc.migration_id = m.id
       WHERE p.tenant_id = ?
       GROUP BY week ORDER BY week DESC LIMIT 8`,
      tenantId,
    ) as Array<{ week: string; low: number; medium: number; high: number; critical: number }>;

    const migrationsByRisk = weeks.reverse().map((w) => ({
      label: (w.week || "").replace(/^0+/, "").substring(0, 5),
      low: Number(w.low) || 0,
      medium: Number(w.medium) || 0,
      critical: (Number(w.high) || 0) + (Number(w.critical) || 0),
    }));

    res.json({ totalMigrations, affectedServices, activeProjects, criticalRisks: criticalRow?.count || 0, migrationsByRisk });
  } catch (err: any) {
    console.error("stats error:", err.message);
    res.status(500).json({ error: "failed to load stats" });
  }
});

export default router;
