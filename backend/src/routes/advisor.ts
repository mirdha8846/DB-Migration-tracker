import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { advisorChat } from "../services/deepseek-agent";

const router = Router();

router.get("/advisor/insights", authMiddleware, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const rows = await db.all(
      `SELECT ir.id, ir.ai_explanation as message, ir.overall_risk as severity, ir.migration_id, ir.created_at
       FROM impact_reports ir JOIN migrations m ON ir.migration_id = m.id
       JOIN projects p ON m.project_id = p.id WHERE p.tenant_id = ?
       ORDER BY ir.created_at DESC LIMIT 10`,
      tenantId,
    ) as Array<any>;

    const result = rows.map((r) => ({
      id: r.id, message: r.message || "No analysis available",
      tags: ["SCHEMA_CHANGE", r.severity === "high" || r.severity === "critical" ? "LOCKING_RISK" : "BEST_PRACTICE"],
      migrationId: r.migration_id, createdAt: r.created_at,
    }));

    console.log(`🤖 Advisor insights: ${result.length} items`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: "failed to load insights" });
  }
});

router.post("/advisor/chat", authMiddleware, async (req: Request, res: Response) => {
  try {
    const message = typeof req.body?.message === "string" ? req.body.message : "";
    if (!message.trim()) { res.status(400).json({ error: "message is required" }); return; }

    console.log(`🤖 Advisor chat: "${message.substring(0, 60)}..."`);

    const tenantId = req.user!.tenantId;
    const projectSummary = await db.get(
      `SELECT p.name, p.db_type, COUNT(DISTINCT r.id) as repoCount, COUNT(DISTINCT m.id) as migrationCount
       FROM projects p LEFT JOIN registered_repos r ON r.project_id = p.id
       LEFT JOIN migrations m ON m.project_id = p.id WHERE p.tenant_id = ? GROUP BY p.id LIMIT 1`,
      tenantId,
    ) as any;

    const projectContext = projectSummary
      ? `Project: ${projectSummary.name} (${projectSummary.db_type}), ${projectSummary.repoCount} repos`
      : undefined;

    const response = await advisorChat(message, projectContext);

    res.json({
      id: `ai-${Date.now()}`, role: "assistant",
      content: response.reply, sources: response.sourcesReferenced,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: "chat failed" });
  }
});

export default router;
