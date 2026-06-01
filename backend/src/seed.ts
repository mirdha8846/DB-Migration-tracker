import db from "./config/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function seed() {
  // Connect first (important for PostgreSQL)
  await db.connect();

  const existing = await db.get("SELECT 1 FROM users WHERE email = ?", "admin@schemaguard.io");
  if (existing) { console.log("✅ Database already seeded"); return; }

  const tenantId = randomUUID();
  const userId = randomUUID();
  const projectId = randomUUID();

  await db.run("INSERT INTO tenants (id, name, plan) VALUES (?, ?, ?)", tenantId, "Demo Workspace", "pro");

  const hashed = bcrypt.hashSync("admin123", 10);
  await db.run("INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
    userId, tenantId, "admin@schemaguard.io", "Admin User", "admin", hashed);
  console.log("✅ Demo user: admin@schemaguard.io / admin123");

  await db.run("INSERT INTO projects (id, tenant_id, name, db_type, created_by) VALUES (?, ?, ?, ?, ?)",
    projectId, tenantId, "production-v2", "postgres", userId);

  const repos = [
    { url: "https://github.com/demo/order-service", name: "Order Service", lang: "java" },
    { url: "https://github.com/demo/inventory-sync", name: "Inventory Sync", lang: "python" },
    { url: "https://github.com/demo/analytics-ui", name: "Analytics UI", lang: "typescript" },
  ];
  for (const r of repos) {
    await db.run("INSERT INTO registered_repos (id, project_id, github_repo_url, service_name, primary_language) VALUES (?, ?, ?, ?, ?)",
      randomUUID(), projectId, r.url, r.name, r.lang);
  }

  const migrationId = randomUUID();
  await db.run(
    "INSERT INTO migrations (id, project_id, pr_number, pr_url, github_repo_url, file_path, file_content, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    migrationId, projectId, 402,
    "https://github.com/demo/order-service/pull/402",
    "https://github.com/demo/order-service",
    "v1.2.4_expand_orders.sql",
    `-- MIGRATION: 8842-X\nALTER TABLE public.orders ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';\nCREATE INDEX CONCURRENTLY idx_orders_metadata ON public.orders USING GIN ((metadata->'order_type'));`,
    "analyzed",
  );

  await db.run("INSERT INTO schema_changes (id, migration_id, change_type, table_name, column_name, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
    randomUUID(), migrationId, "add_column", "orders", "metadata", "low");
  await db.run("INSERT INTO schema_changes (id, migration_id, change_type, table_name, column_name, risk_level) VALUES (?, ?, ?, ?, ?, ?)",
    randomUUID(), migrationId, "add_index", "orders", "idx_orders_metadata", "low");

  await db.run(
    "INSERT INTO impact_reports (id, migration_id, overall_risk, affected_services, ai_explanation, ai_fix_steps) VALUES (?, ?, ?, ?, ?, ?)",
    randomUUID(), migrationId, "high",
    '["Order Service","Inventory Sync"]',
    "Table orders is currently experiencing 1.2k req/sec.",
    "Run SQL migration scripts.\nDeploy schema bindings.\nFlush Redis tags.\nRun smoke tests.",
  );

  // Vault secrets
  const secrets = [
    { name: "Production DB Credentials", type: "PostgreSQL", scope: "production-v2", status: "ACTIVE" },
    { name: "GitHub App Private Key", type: "GitHub Integration", scope: "org-wide", status: "ACTIVE" },
    { name: "Anthropic API Key", type: "AI Agent", scope: "advisor-service", status: "EXPIRING" },
    { name: "Slack Webhook Secret", type: "Notifications", scope: "alerts-channel", status: "REVOKED" },
  ];
  for (const s of secrets) {
    await db.run("INSERT INTO vault_secrets (id, name, type, scope, last_rotated, status) VALUES (?, ?, ?, ?, ?, ?)",
      randomUUID(), s.name, s.type, s.scope, new Date().toISOString(), s.status);
  }

  console.log("✅ Database seeded successfully");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
