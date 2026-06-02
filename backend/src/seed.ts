import db from "./config/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import "dotenv/config";

async function seed() {
  await db.connect();

  const email = process.env.SEED_EMAIL || "admin@schemaguard.io";
  const password = process.env.SEED_PASSWORD || "admin123";
  const name = process.env.SEED_NAME || "Admin User";
  const workspace = process.env.SEED_WORKSPACE || "My Workspace";
  const projectName = process.env.SEED_PROJECT || "my-project";

  const existing = await db.get("SELECT 1 FROM users WHERE email = ?", email);
  if (existing) { console.log("✅ Database already seeded"); return; }

  const tenantId = randomUUID();
  const userId = randomUUID();
  const projectId = randomUUID();

  await db.run("INSERT INTO tenants (id, name, plan) VALUES (?, ?, ?)", tenantId, workspace, "pro");

  const hashed = bcrypt.hashSync(password, 10);
  await db.run("INSERT INTO users (id, tenant_id, email, name, role, password_hash) VALUES (?, ?, ?, ?, ?, ?)",
    userId, tenantId, email, name, "admin", hashed);
  console.log(`✅ User created: ${email}`);

  await db.run("INSERT INTO projects (id, tenant_id, name, db_type, created_by) VALUES (?, ?, ?, ?, ?)",
    projectId, tenantId, projectName, "postgres", userId);

  // Seed repos from env or skip
  const repoUrls = process.env.SEED_REPOS ? process.env.SEED_REPOS.split(",") : [];
  if (repoUrls.length > 0) {
    for (const url of repoUrls) {
      const [repoUrl, serviceName, lang] = url.split("|");
      await db.run("INSERT INTO registered_repos (id, project_id, github_repo_url, service_name, primary_language) VALUES (?, ?, ?, ?, ?)",
        randomUUID(), projectId, repoUrl || url, serviceName || "unknown", lang || "java");
    }
    console.log(`✅ ${repoUrls.length} repos seeded`);
  }

  // Seed vault secrets from env
  const vaultSecrets = process.env.SEED_VAULT_SECRETS ? process.env.SEED_VAULT_SECRETS.split(",") : [];
  for (const secret of vaultSecrets) {
    const [name, type, scope] = secret.split("|");
    await db.run("INSERT INTO vault_secrets (id, name, type, scope, last_rotated, status) VALUES (?, ?, ?, ?, ?, 'ACTIVE')",
      randomUUID(), name || secret, type || "generic", scope || "default", new Date().toISOString());
  }

  console.log("✅ Database seeded successfully");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
