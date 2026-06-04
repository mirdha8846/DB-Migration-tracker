import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import db from "./config/db";
import authRoutes from "./routes/auth";
import statsRoutes from "./routes/stats";
import migrationsRoutes from "./routes/migrations";
import advisorRoutes from "./routes/advisor";
import projectsRoutes from "./routes/projects";
import vaultRoutes from "./routes/vault";
import webhookRoutes from "./routes/webhook";
import scanRoutes from "./routes/scan";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use((req, _res, next) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = _res;
    const icon = statusCode >= 400 ? "❌" : statusCode >= 300 ? "↪" : "✅";
    console.log(`${icon} [${new Date().toLocaleTimeString()}] ${method} ${url} → ${statusCode} (${duration}ms)`);
  });
  next();
});

app.use(cors());

// Webhook raw body parser — must run BEFORE express.json()
app.use("/webhook", express.raw({ type: "*/*" }), (req: any, _res, next) => {
  if (req.body && Buffer.isBuffer(req.body)) {
    req.rawBody = req.body;
    try { req.body = JSON.parse(req.body.toString()); } catch { req.body = {}; }
  }
  next();
});

app.use(express.json());

app.use(authRoutes);
app.use("/api", statsRoutes);
app.use("/api", migrationsRoutes);
app.use("/api", advisorRoutes);
app.use("/api", projectsRoutes);
app.use("/api", vaultRoutes);
app.use("/api", scanRoutes);
app.use(webhookRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", message: "Server is up and running" });
});

app.get("/health/db", (_req, res) => {
  const dbUrl = process.env.DB_URL || process.env.DATABASE_URL || "";
  res.json({
    dbMode: db.isPostgres() ? "PostgreSQL" : "SQLite",
    dbUrlConfigured: !!dbUrl,
    dbUrlPrefix: dbUrl ? dbUrl.substring(0, 30) + "..." : "not set",
    projectsCount: "check via API",
  });
});

async function start() {
  await db.connect();

  // Auto-seed if DB is empty
  const userCount = await db.get("SELECT COUNT(*) as count FROM users") as any;
  if (!userCount || userCount.count === 0) {
    console.log("🌱 Empty database detected — auto-seeding...");
    try {
      const tenantId = randomUUID();
      const userId = randomUUID();
      const email = process.env.SEED_EMAIL || "admin@schemaguard.io";
      const password = process.env.SEED_PASSWORD || "admin123";
      const hashed = bcrypt.hashSync(password, 10);

      await db.run("INSERT INTO tenants (id, name, plan) VALUES (?, ?, ?)", tenantId, "My Workspace", "pro");
      await db.run("INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
        userId, tenantId, email, "Admin User", "admin", hashed);
      console.log(`✅ Auto-seeded user: ${email}`);
    } catch (err: any) {
      console.error("Auto-seed failed:", err.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`🚀 SchemaGuard backend running on http://localhost:${PORT}`);
    console.log(`📋 Auth: POST /auth/login, POST /auth/register, GET /auth/me`);
    console.log(`📊 CRUD: /api/stats, /api/migrations, /api/projects, /api/vault, /api/advisor`);
    console.log(`🔍 Scan: /api/scan/project/:id, /api/scan/status/:id, /api/scan/parse-sql, /api/scan/db-stats/:table`);
    console.log(`🔔 Webhook: POST /webhook/github`);
    console.log(`🐘 DB: ${db.isPostgres() ? "PostgreSQL" : "SQLite"}`);
    console.log(`🤖 AI: Deepseek ${process.env.DEEPSEEK_API_KEY ? "✅" : "⚠️ not set"}`);
  });
}

start();
