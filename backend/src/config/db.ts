import DatabaseLib from "better-sqlite3";
import { Pool } from "pg";
import path from "path";
import fs from "fs";
import "dotenv/config";

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
    password_hash TEXT, github_login TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id),
    name TEXT NOT NULL, db_type TEXT NOT NULL DEFAULT 'postgres',
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS registered_repos (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    github_repo_url TEXT NOT NULL, service_name TEXT NOT NULL,
    primary_language TEXT NOT NULL, last_scanned_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    pr_number INTEGER, pr_url TEXT, github_repo_url TEXT NOT NULL,
    file_path TEXT NOT NULL, file_content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS schema_changes (
    id TEXT PRIMARY KEY, migration_id TEXT NOT NULL REFERENCES migrations(id),
    change_type TEXT NOT NULL, table_name TEXT NOT NULL, column_name TEXT,
    risk_level TEXT NOT NULL DEFAULT 'low',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS dependency_graph (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
    repo_id TEXT NOT NULL REFERENCES registered_repos(id),
    table_name TEXT NOT NULL, column_name TEXT,
    file_path TEXT NOT NULL, line_number INTEGER,
    usage_type TEXT NOT NULL, code_snippet TEXT,
    is_dynamic INTEGER NOT NULL DEFAULT 0, confidence REAL NOT NULL DEFAULT 1.0,
    last_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS impact_reports (
    id TEXT PRIMARY KEY, migration_id TEXT NOT NULL REFERENCES migrations(id),
    overall_risk TEXT NOT NULL, affected_services TEXT NOT NULL DEFAULT '[]',
    ai_explanation TEXT, ai_fix_steps TEXT,
    posted_to_github INTEGER NOT NULL DEFAULT 0,
    posted_to_slack INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS vault_secrets (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
    scope TEXT NOT NULL, last_rotated TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE', value TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL,
    user_id TEXT, action TEXT NOT NULL,
    entity_type TEXT, entity_id TEXT, metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

type Row = Record<string, any>;

class DatabaseAdapter {
  private sqlite: any = null;
  private pgPool: Pool | null = null;
  private mode: "sqlite" | "pg" = "sqlite";

  constructor() {
    const dbUrl = process.env.DB_URL || process.env.DATABASE_URL || "";

    if (dbUrl && dbUrl.startsWith("postgres")) {
      this.mode = "pg";
      this.pgPool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });
      console.log("🐘 Using PostgreSQL");
    } else {
      const dbPath = path.join(__dirname, "..", "..", "data", "schemaguard.db");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      this.sqlite = new DatabaseLib(dbPath);
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.exec(SQLITE_SCHEMA);
      console.log("📦 Using SQLite");
    }
  }

  async connect(): Promise<void> {
    if (this.pgPool) {
      try {
        const c = await this.pgPool.connect();
        c.release();
        console.log("✅ PostgreSQL connected");
        await this.initPgSchema();
        return;
      } catch (err: any) {
        console.log(`⚠️ PostgreSQL unavailable (${err.message}), falling back to SQLite`);
        this.mode = "sqlite";
        this.pgPool = null;
      }
    }
    this.ensureSqlite();
  }

  private ensureSqlite() {
    if (!this.sqlite) {
      const dbPath = path.join(__dirname, "..", "..", "data", "schemaguard.db");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      this.sqlite = new DatabaseLib(dbPath);
      this.sqlite.pragma("journal_mode = WAL");
      this.sqlite.pragma("foreign_keys = ON");
      this.sqlite.exec(SQLITE_SCHEMA);
      console.log("📦 Using SQLite (fallback)");
    }
  }

  private replacePlaceholders(sql: string, params: any[]): string {
    let idx = 0;
    return sql.replace(/\?/g, () => `$${++idx}`);
  }

  async get<T = Row>(sql: string, ...params: any[]): Promise<T | null> {
    if (this.mode === "sqlite" || !this.pgPool) {
      this.ensureSqlite();
      return this.sqlite.prepare(sql).get(...params) as T | null;
    }
    const pgSql = this.replacePlaceholders(sql, params);
    const result = await this.pgPool!.query(pgSql, params);
    return (result.rows[0] as T) || null;
  }

  async all<T = Row>(sql: string, ...params: any[]): Promise<T[]> {
    if (this.mode === "sqlite" || !this.pgPool) {
      this.ensureSqlite();
      return this.sqlite.prepare(sql).all(...params) as T[];
    }
    const pgSql = this.replacePlaceholders(sql, params);
    const result = await this.pgPool!.query(pgSql, params);
    return result.rows as T[];
  }

  async run(sql: string, ...params: any[]): Promise<{ changes: number; lastId?: string }> {
    if (this.mode === "sqlite" || !this.pgPool) {
      this.ensureSqlite();
      const result = this.sqlite.prepare(sql).run(...params);
      return { changes: result.changes, lastId: String(result.lastInsertRowid) };
    }
    const pgSql = this.replacePlaceholders(sql, params);
    const result = await this.pgPool!.query(pgSql, params);
    return { changes: result.rowCount || 0 };
  }

  async exec(sql: string): Promise<void> {
    if (this.sqlite) {
      this.sqlite.exec(sql);
      return;
    }
    await this.pgPool!.query(sql);
  }

  transaction<T>(fn: () => T): T {
    if (this.sqlite) {
      return this.sqlite.transaction(fn)();
    }
    return fn(); // No transaction for pg in simple mode
  }

  isPostgres(): boolean {
    return this.mode === "pg";
  }

  async initPgSchema(): Promise<void> {
    if (!this.pgPool) return;
    await this.exec(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
        password_hash TEXT, github_login TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL, db_type TEXT NOT NULL DEFAULT 'postgres',
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS registered_repos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        github_repo_url TEXT NOT NULL, service_name TEXT NOT NULL,
        primary_language TEXT NOT NULL, last_scanned_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS migrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        pr_number INTEGER, pr_url TEXT, github_repo_url TEXT NOT NULL,
        file_path TEXT NOT NULL, file_content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS schema_changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
        change_type TEXT NOT NULL, table_name TEXT NOT NULL, column_name TEXT,
        risk_level TEXT NOT NULL DEFAULT 'low',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS dependency_graph (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        repo_id UUID NOT NULL REFERENCES registered_repos(id) ON DELETE CASCADE,
        table_name TEXT NOT NULL, column_name TEXT,
        file_path TEXT NOT NULL, line_number INTEGER,
        usage_type TEXT NOT NULL, code_snippet TEXT,
        is_dynamic BOOLEAN NOT NULL DEFAULT false,
        confidence REAL NOT NULL DEFAULT 1.0,
        last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS impact_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        migration_id UUID NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
        overall_risk TEXT NOT NULL, affected_services JSONB NOT NULL DEFAULT '[]',
        ai_explanation TEXT, ai_fix_steps TEXT,
        posted_to_github BOOLEAN NOT NULL DEFAULT false,
        posted_to_slack BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS vault_secrets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL, type TEXT NOT NULL, scope TEXT NOT NULL,
        last_rotated TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', value TEXT
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL, user_id UUID,
        action TEXT NOT NULL, entity_type TEXT, entity_id UUID,
        metadata JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✅ PostgreSQL schema initialized");
  }
}

const adapter = new DatabaseAdapter();
export default adapter;
