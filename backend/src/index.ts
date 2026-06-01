import express from "express";
import cors from "cors";
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
app.use("/webhook", express.raw({ type: "application/json" }), (req, _res, next) => {
  try {
    req.body = JSON.parse(req.body.toString());
  } catch {
    req.body = {};
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
  res.json({ status: "ok" });
});

async function start() {
  await db.connect();

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
