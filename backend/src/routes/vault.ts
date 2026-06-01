import { Router, Request, Response } from "express";
import db from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { randomUUID } from "crypto";

const router = Router();

router.get("/vault/stats", authMiddleware, async (_req: Request, res: Response) => {
  const row = await db.get(
    `SELECT COUNT(*) as storedSecrets,
            (SELECT COUNT(*) FROM vault_secrets WHERE status = 'ACTIVE') as activeGrants,
            (SELECT COUNT(*) FROM vault_secrets WHERE status = 'EXPIRING') as rotationsDue
     FROM vault_secrets`,
  ) as { storedSecrets: number; activeGrants: number; rotationsDue: number };
  res.json(row || { storedSecrets: 0, activeGrants: 0, rotationsDue: 0 });
});

router.get("/vault/secrets", authMiddleware, async (_req: Request, res: Response) => {
  const rows = await db.all(
    "SELECT id, name, type, scope, last_rotated as lastRotated, status FROM vault_secrets ORDER BY last_rotated DESC",
  );
  res.json(rows);
});

router.post("/vault/secrets", authMiddleware, async (req: Request, res: Response) => {
  const { name, type, scope } = req.body;
  if (!name || !type || !scope) { res.status(400).json({ error: "name, type and scope required" }); return; }
  const id = randomUUID();
  const now = db.isPostgres() ? new Date().toISOString() : "datetime('now')";
  await db.run(
    `INSERT INTO vault_secrets (id, name, type, scope, last_rotated, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')`,
    id, String(name), String(type), String(scope),
  );
  await db.run("UPDATE vault_secrets SET last_rotated = ? WHERE id = ?", new Date().toISOString(), id);
  const row = await db.get("SELECT id, name, type, scope, last_rotated as lastRotated, status FROM vault_secrets WHERE id = ?", id);
  res.status(201).json(row);
});

router.put("/vault/secrets/:id/rotate", authMiddleware, async (req: Request, res: Response) => {
  const result = await db.run(
    "UPDATE vault_secrets SET last_rotated = ?, status = 'ACTIVE' WHERE id = ?",
    new Date().toISOString(), req.params.id,
  );
  if (result.changes === 0) { res.status(404).json({ error: "secret not found" }); return; }
  const row = await db.get("SELECT id, name, type, scope, last_rotated as lastRotated, status FROM vault_secrets WHERE id = ?", req.params.id);
  res.json(row);
});

export default router;
