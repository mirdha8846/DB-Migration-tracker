import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db";
import { authMiddleware, AuthPayload } from "../middleware/auth";
import { JWT_SECRET } from "../config/env";
import { randomUUID } from "crypto";

const router = Router();

function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: "email, password, and name are required" });
      return;
    }

    const existing = await db.get("SELECT id FROM users WHERE email = ?", email);
    if (existing) {
      res.status(409).json({ error: "email already registered" });
      return;
    }

    const tenantId = randomUUID();
    await db.run("INSERT INTO tenants (id, name, plan) VALUES (?, ?, ?)", tenantId, `${name}'s Workspace`, "free");

    const userId = randomUUID();
    const hashed = await bcrypt.hash(password, 10);
    await db.run(
      "INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
      userId, tenantId, email, name, "admin", hashed,
    );

    const payload: AuthPayload = { userId, tenantId, email, role: "admin" };
    const token = signToken(payload);

    console.log(`👤 User registered: ${email}`);
    res.status(201).json({ token, user: { id: userId, email, name, role: "admin" } });
  } catch (err: any) {
    console.error("register error:", err.message);
    res.status(500).json({ error: "registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const user = await db.get(
      "SELECT id, tenant_id, email, name, role, password_hash FROM users WHERE email = ?",
      email,
    ) as any;

    if (!user || !user.password_hash) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }

    const payload: AuthPayload = {
      userId: user.id, tenantId: user.tenant_id,
      email: user.email, role: user.role,
    };
    const token = signToken(payload);

    console.log(`👤 User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (err: any) {
    console.error("login error:", err.message);
    res.status(500).json({ error: "login failed" });
  }
});

router.get("/auth/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = await db.get("SELECT id, email, name, role FROM users WHERE id = ?", req.user!.userId) as any;
    if (!user) {
      res.status(404).json({ error: "user not found" });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "failed to fetch user" });
  }
});

export default router;
