# ═══════════════════════════════════════════════════════════════════
# BACKEND ARCHITECTURE — COMPLETE
# Every service, every endpoint, every responsibility
# ═══════════════════════════════════════════════════════════════════

## SERVICES MAP

:8080  api-gateway          → JWT auth, rate limit, route all /api/* requests
:8081  schema-analyzer      → Parse SQL, detect changes, call GitHub API
:8082  db-inspector         → Connect to customer DB, get live stats (NEW - from screenshots)
:8083  report-service       → CRUD: projects, migrations, reports, vault
:8084  ai-agent-service     → Deepseek AI: 3 agents
:8085  notification-service → GitHub PR comments, Slack
:8086  codebase-scanner     → Clone repos, Tree-sitter AST scan
3000   Next.js dashboard    → Your frontend (already built)

## ═══ SERVICE 1: api-gateway (:8080) ═══════════════════════════

WHAT IT DOES:
  Single entry point for all frontend requests.
  Validates JWT. Adds X-Tenant-ID + X-User-ID headers.
  Routes to correct downstream service.
  Rate limiting per user via Redis.

ENDPOINTS IT EXPOSES (all pass-through after auth):
  POST /auth/login
  POST /auth/register
  GET  /auth/me
  ALL  /api/**        → routes to report-service :8083
  ALL  /advisor/**    → routes to ai-agent-service :8084
  POST /webhook/github → routes to schema-analyzer :8081 (NO auth - webhook)

ROUTING TABLE:
  /api/stats/**         → report-service
  /api/projects/**      → report-service
  /api/migrations/**    → report-service + schema-analyzer
  /api/reports/**       → report-service
  /api/vault/**         → report-service
  /api/graph/**         → report-service
  /api/db-stats/**      → db-inspector
  /advisor/**           → ai-agent-service

DOES NOT DO:
  ❌ Business logic
  ❌ DB access (except users table for auth)
  ❌ Kafka publishing

## ═══ SERVICE 2: schema-analyzer (:8081) ══════════════════════

WHAT IT DOES:
  Receives GitHub webhooks.
  Parses SQL migration files.
  Detects change types and risk levels.
  Publishes to Kafka.

ENDPOINTS:
  POST /webhook/github
    - Validate HMAC-SHA256 signature
    - Accept only "pull_request" events, action "opened"/"synchronize"
    - Find migration files in PR (path contains /migration OR name V[0-9]+__*.sql)
    - Fetch file content from GitHub API
    - Parse SQL → save Migration + SchemaChange records
    - Publish to Kafka: schema.analysis.complete
    - Return 200 immediately

SQL PARSING — DETECT THESE (with risk levels):
  DROP TABLE                          → CRITICAL
  DROP COLUMN                         → CRITICAL
  RENAME COLUMN                       → HIGH
  ALTER COLUMN TYPE                   → HIGH
  ADD COLUMN NOT NULL (no default)    → HIGH
  DROP INDEX                          → MEDIUM
  ADD COLUMN (nullable with default)  → LOW
  CREATE TABLE                        → LOW
  CREATE INDEX                        → LOW
  ADD CONSTRAINT                      → MEDIUM (check if FK)
  COMMENT ON COLUMN                   → LOW

LOCKING THREAT DETECTION (shown in your screenshot):
  CREATE INDEX (without CONCURRENTLY) → SEVERE locking threat
  ALTER TABLE on high-traffic tables  → check via db-inspector
  DROP TABLE                          → SEVERE
  ADD COLUMN NOT NULL                 → HIGH

DOES NOT DO:
  ❌ Scan codebases (that's codebase-scanner)
  ❌ Call Anthropic API (that's ai-agent-service)
  ❌ Post to GitHub (that's notification-service)

## ═══ SERVICE 3: db-inspector (:8082) ══════════════════════════

WHAT IT DOES (new service — required by your screenshot):
  Connects to customer's actual PostgreSQL database.
  Queries pg_stat_* tables to get live metrics.
  Used by AI Guardian to show "1.2k req/sec" etc.
  Stores DB credentials from Vault service.

ENDPOINTS:
  GET /api/db-stats/{projectId}/table/{tableName}
    Response: {
      tableName,
      requestsPerSecond: 1200,
      totalRows: 5_000_000,
      tableSize: "2.3 GB",
      lastVacuum: "2024-10-18T03:00:00",
      vacuumProtectionActive: true,
      bloatPercent: 12,
      activeConnections: 34
    }

  GET /api/db-stats/{projectId}/overview
    Response: {
      totalTables: 47,
      totalSize: "18 GB",
      activeConnections: 120,
      slowQueriesCount: 3,
      replicationLag: "0ms"
    }

  POST /api/db-stats/{projectId}/connection-test
    Body: { host, port, dbName, user, password }
    Response: { success: boolean, latencyMs: number, version: string }

HOW IT CONNECTS TO CUSTOMER DB:
  Credentials stored in vault (encrypted).
  On request: fetch credentials from vault → create connection pool → query → close.
  Use HikariCP with short timeout (5s max).
  Never store credentials in memory longer than request lifecycle.

SQL QUERIES IT RUNS ON CUSTOMER DB:
  Table stats:
    SELECT schemaname, relname, n_live_tup, n_dead_tup,
           pg_size_pretty(pg_total_relation_size(relid)) as size,
           last_vacuum, last_autovacuum, last_analyze
    FROM pg_stat_user_tables
    WHERE relname = '{tableName}'

  Request rate (approximate):
    SELECT sum(calls) as total_calls, sum(total_exec_time) as total_time
    FROM pg_stat_statements
    WHERE query ILIKE '%{tableName}%'
    AND now() - to_timestamp(0) < interval '1 minute'

  Active connections:
    SELECT count(*) FROM pg_stat_activity WHERE state = 'active'

DOES NOT DO:
  ❌ Modify customer DB
  ❌ Store customer data
  ❌ Keep persistent connections

## ═══ SERVICE 4: report-service (:8083) ═════════════════════════

WHAT IT DOES:
  Master CRUD service. All data lives here.
  Serves frontend data for all 4 pages.
  Manages vault secrets.

ALL ENDPOINTS:

── STATS (Dashboard page) ──
GET /api/stats/overview
  Response: {
    totalMigrations: 1284,
    affectedServices: 14,
    activeProjects: 32,
    migrationsByRisk: [
      { week: "M1", low: 12, medium: 8, high: 5, critical: 2 }
      ... 8 weeks
    ]
  }

── PROJECTS ──
GET    /api/projects              → list all (filtered by tenantId)
POST   /api/projects              → create { name, dbType, dbHost, dbPort, dbName }
GET    /api/projects/{id}         → detail with repo count + migration count
PUT    /api/projects/{id}         → update
DELETE /api/projects/{id}

── REGISTERED REPOS ──
GET    /api/projects/{id}/repos
POST   /api/projects/{id}/repos   → { githubRepoUrl, serviceName, language }
DELETE /api/projects/{id}/repos/{repoId}

── MIGRATIONS ──
GET  /api/migrations/recent?limit=10   → Dashboard recent list
GET  /api/projects/{id}/migrations     → paginated list
GET  /api/migrations/{id}              → full detail (with changes + report + live stats)
POST /api/migrations/{id}/approve      → update status="approved", trigger deploy notification
POST /api/migrations/{id}/reject       → update status="rejected", { reason }

── REPORTS ──
GET /api/reports/{migrationId}         → full impact report
GET /api/projects/{id}/reports/stats   → { total, critical, high, medium, low }

── DEPENDENCY GRAPH ──
GET /api/projects/{id}/graph
  Response: {
    nodes: [
      { id: "svc-1", name: "Order Service", type: "service" },
      { id: "tbl-1", name: "production.users", type: "table", riskLevel: "low" },
      { id: "tbl-2", name: "production.tx_logs", type: "table", riskLevel: "critical" }
    ],
    edges: [
      { source: "svc-1", target: "tbl-1", style: "solid" },
      { source: "svc-1", target: "tbl-2", style: "dashed" }
    ]
  }

── VAULT ACCESS (Page 4) ──
GET  /api/vault/stats
  Response: { storedSecrets: 24, activeGrants: 11, rotationsDue: 2, nextRotationDays: 4 }

GET  /api/vault/secrets
  Response: [{
    id, name, type, scope, lastRotated, status: "active"|"expiring"|"revoked",
    expiresAt, createdBy
  }]
  NOTE: Never return actual secret values — only metadata

POST /api/vault/secrets
  Body: { name, type, scope, value (encrypted before storing), expiryDays }

PUT  /api/vault/secrets/{id}/rotate
  → Generate new secret / update rotation timestamp
  → Return: { success, nextRotationDate }

DELETE /api/vault/secrets/{id}

── ADVISOR INSIGHTS (Dashboard right panel) ──
GET /api/advisor/insights
  Response: [{
    id, message, projectName, tags: ["SCHEMA_CHANGE", "LOCKING_RISK"],
    severity: "high", migrationId (for linking), createdAt
  }]

## ═══ SERVICE 5: ai-agent-service (:8084) ═══════════════════════

WHAT IT DOES:
  Three AI agents using Anthropic Claude API.
  Chat endpoint for AI Advisor panel (Dashboard).
  Background analysis for migration risk.

ENDPOINTS:
  POST /advisor/chat
    Body: { sessionId, projectId, message }
    Response: { reply, tags: ["SCHEMA_CHANGE"], severity: "warning" }

  POST /internal/analyze/migration
    Body: { migrationId }
    Triggered by Kafka: scan.complete
    Runs Agent 1 (Impact Analyst) + Agent 2 (Risk Explainer)
    Saves results to DB via report-service

AGENTS:
  Agent 1 — Impact Analyst
    Input: code snippets from codebase scan that are ambiguous
    Task: "Is this code actually using this column?" with confidence score
    Uses Claude Sonnet, expects JSON response

  Agent 2 — Risk Explainer
    Input: all detected changes + affected services from scan
    Task: Generate natural language explanation + fix steps + deploy order
    Also generates: AI Guardian Insight bullets (like your screenshot shows)
    Saves: ai_explanation, ai_guardian_bullets to impact_reports

  Agent 3 — Migration Advisor (Chat)
    Input: user message + session history + project context
    Task: Conversational answers about schema safety
    Context includes: project's dependency graph, recent incidents
    Proactive: also generates dashboard insight cards (GET /api/advisor/insights)

## ═══ SERVICE 6: notification-service (:8085) ═══════════════════

WHAT IT DOES:
  Listens to Kafka: ai.analysis.complete
  Posts GitHub PR comment with full impact report
  Sends Slack message if risk HIGH/CRITICAL

DOES NOT DO:
  ❌ Any DB writes (only reads impact_reports via report-service API)
  ❌ Any AI calls

## ═══ SERVICE 7: codebase-scanner (:8086) ═══════════════════════

WHAT IT DOES:
  Listens to Kafka: schema.analysis.complete
  Clones registered repos via JGit
  Scans code with Tree-sitter (see tree-sitter document)
  Saves to dependency_graph table
  Publishes to Kafka: scan.complete

TREE-SITTER INTEGRATION (see 04_TREE_SITTER.md for full detail)

## ═══ KAFKA TOPICS (event flow) ══════════════════════════════════

Topic 1: schema.analysis.complete
  Producer: schema-analyzer
  Consumer: codebase-scanner
  Payload: { migrationId, projectId, changes[], prNumber, prUrl, repoFullName }

Topic 2: scan.complete
  Producer: codebase-scanner
  Consumer: ai-agent-service
  Payload: { migrationId, projectId, matchCount, affectedServices[] }

Topic 3: ai.analysis.complete
  Producer: ai-agent-service
  Consumer: notification-service
  Payload: { migrationId, projectId, overallRisk, prNumber, repoFullName }

## ═══ DATABASE TABLES (PostgreSQL + pgvector) ═════════════════════

tenants          → companies using SchemaGuard
users            → users per tenant
projects         → one per database being monitored
registered_repos → microservices connected to a project
migrations       → each migration file detected
schema_changes   → individual changes within a migration
dependency_graph → which service uses which table/column
impact_reports   → AI-generated report per migration
vault_secrets    → encrypted secrets metadata (NOT the actual values)
vault_secret_values → encrypted actual values (separate table, tighter access)
audit_log        → every action logged
incidents        → past production incidents
policies         → rules per project (require approval, block hours etc)
schema_embeddings → pgvector embeddings for similarity search

## ═══ WHAT NOT TO BUILD (honest list) ════════════════════════════

❌ DO NOT build Kafka from day 1
   Start with direct HTTP calls between services
   Add Kafka in Week 3 when everything else works

❌ DO NOT build Temporal from day 1
   Use Spring @Async for codebase scanning first
   Add Temporal in Week 4 when scan jobs need retry logic

❌ DO NOT build separate report-service and schema-analyzer at first
   Start with ONE Spring Boot app that does both
   Split later when the monolith gets too big

❌ DO NOT build Vault feature first
   It's a nice-to-have, not core
   Build it last (Week 6+)

❌ DO NOT connect to customer DB from day 1
   Hardcode "1.2k req/sec" temporarily
   Build db-inspector in Week 5

✅ DO build in this order:
   Week 1: Auth + CRUD APIs (report-service) + connect frontend
   Week 2: Schema Analyzer + webhook + GitHub integration
   Week 3: Codebase Scanner (simple regex first, Tree-sitter later)
   Week 4: AI Agent service (all 3 agents)
   Week 5: Notification service + db-inspector
   Week 6: Kafka, Temporal, Vault — production hardening