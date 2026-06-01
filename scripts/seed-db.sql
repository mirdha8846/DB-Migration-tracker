-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS (companies using SchemaGuard) ──────────────────────
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    plan        VARCHAR(50)  NOT NULL DEFAULT 'free', -- free | pro | enterprise
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── USERS ──────────────────────────────────────────────────────
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email        VARCHAR(255) NOT NULL UNIQUE,
    name         VARCHAR(255) NOT NULL,
    role         VARCHAR(50)  NOT NULL DEFAULT 'member', -- admin | member
    github_login VARCHAR(100),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── PROJECTS ───────────────────────────────────────────────────
-- A project = one database being tracked (e.g. "payments-db")
CREATE TABLE projects (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    db_type     VARCHAR(50)  NOT NULL, -- postgres | mysql | mssql
    created_by  UUID         NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── REGISTERED REPOS ───────────────────────────────────────────
-- Services / microservices that connect to a project's DB
CREATE TABLE registered_repos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    github_repo_url VARCHAR(500) NOT NULL,
    service_name    VARCHAR(255) NOT NULL,
    primary_language VARCHAR(50) NOT NULL, -- java | python | go | js | ts
    last_scanned_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── MIGRATIONS ─────────────────────────────────────────────────
-- Each migration file detected in a PR
CREATE TABLE migrations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    pr_number       INTEGER,
    pr_url          VARCHAR(500),
    github_repo_url VARCHAR(500) NOT NULL,
    file_path       VARCHAR(500) NOT NULL,
    file_content    TEXT         NOT NULL,
    status          VARCHAR(50)  NOT NULL DEFAULT 'pending',
    -- pending | analyzing | analyzed | applied | failed
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── SCHEMA CHANGES ─────────────────────────────────────────────
-- Parsed individual changes from a migration
CREATE TABLE schema_changes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id    UUID         NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
    change_type     VARCHAR(100) NOT NULL,
    -- rename_column | drop_column | add_column | drop_table | alter_column | add_index
    table_name      VARCHAR(255) NOT NULL,
    column_name     VARCHAR(255),
    old_value       JSONB,
    new_value       JSONB,
    risk_level      VARCHAR(20)  NOT NULL DEFAULT 'low', -- low | medium | high | critical
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── DEPENDENCY GRAPH ───────────────────────────────────────────
-- Which service uses which table/column
CREATE TABLE dependency_graph (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo_id         UUID         NOT NULL REFERENCES registered_repos(id) ON DELETE CASCADE,
    table_name      VARCHAR(255) NOT NULL,
    column_name     VARCHAR(255), -- null means whole table reference
    file_path       VARCHAR(500) NOT NULL,
    line_number     INTEGER,
    usage_type      VARCHAR(50)  NOT NULL, -- select | insert | update | delete | join
    code_snippet    TEXT,
    is_dynamic      BOOLEAN      NOT NULL DEFAULT FALSE, -- flagged by AI agent
    confidence      DECIMAL(4,3) NOT NULL DEFAULT 1.0,   -- AI confidence score
    last_updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dep_graph_table ON dependency_graph(project_id, table_name);
CREATE INDEX idx_dep_graph_column ON dependency_graph(project_id, table_name, column_name);

-- ─── SCHEMA EMBEDDINGS ──────────────────────────────────────────
-- pgvector embeddings for schema similarity search
CREATE TABLE schema_embeddings (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(50)  NOT NULL, -- table | column | migration
    entity_name VARCHAR(500) NOT NULL,
    content     TEXT         NOT NULL, -- raw text that was embedded
    embedding   vector(1536) NOT NULL, -- OpenAI/Anthropic embedding dimensions
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_cosine ON schema_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ─── IMPACT REPORTS ─────────────────────────────────────────────
CREATE TABLE impact_reports (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    migration_id     UUID         NOT NULL REFERENCES migrations(id) ON DELETE CASCADE,
    overall_risk     VARCHAR(20)  NOT NULL, -- low | medium | high | critical
    affected_services JSONB       NOT NULL DEFAULT '[]',
    ai_explanation   TEXT,        -- Agent 2 output: natural language explanation
    ai_fix_steps     TEXT,        -- Agent 2 output: step by step fix
    raw_analysis     JSONB,       -- full structured data
    posted_to_github BOOLEAN      NOT NULL DEFAULT FALSE,
    posted_to_slack  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── POLICIES ───────────────────────────────────────────────────
CREATE TABLE policies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type   VARCHAR(100) NOT NULL,
    -- require_approval | block_in_hours | notify_team | min_reviewers
    rule_config JSONB        NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by  UUID         NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── INCIDENTS (historical) ──────────────────────────────────────
CREATE TABLE incidents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id   UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title        VARCHAR(500) NOT NULL,
    description  TEXT,
    root_cause   TEXT,
    tables_involved VARCHAR[],
    severity     VARCHAR(20)  NOT NULL, -- low | medium | high | critical
    resolved_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── AUDIT LOG ──────────────────────────────────────────────────
CREATE TABLE audit_log (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   UUID         NOT NULL,
    user_id     UUID,
    action      VARCHAR(200) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   UUID,
    metadata    JSONB,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
