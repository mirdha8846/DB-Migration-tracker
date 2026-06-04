# ═══════════════════════════════════════════════════════════════════
# SCHEMAGUARD — COMPLETE BUILD DOCUMENT
# Written after seeing actual frontend screenshots
# Version: Final (no more changes to architecture)
# ═══════════════════════════════════════════════════════════════════

## WHAT THIS PRODUCT ACTUALLY IS
# (Based on your 4 screenshots — not assumptions)

SchemaGuard is an enterprise database schema security platform.

A company connects their GitHub repos + PostgreSQL databases.
When a developer opens a PR with a migration file:
  → SchemaGuard parses the SQL
  → Scans all connected microservices for impact
  → Shows risk level (AI-powered)
  → Shows which services break and why
  → Senior architect approves or rejects via dashboard
  → Notification sent (Slack/GitHub comment)

Additional features visible in your UI:
  → Vault Access: store + rotate DB credentials, API keys, secrets
  → Schema Security: dependency graph (which service uses which table)
  → Live DB stats in migration detail (req/sec, vacuum status)

## WHAT YOUR 4 PAGES SHOW

PAGE 1 — /dashboard (Overview)
  - Stats: Total Migrations (1,284), Affected Services (14), Active Projects (32)
  - Bar chart: Migration Volume last 30 days by risk level
  - AI Advisor panel (right sidebar) — chat + proactive insights
  - Recent Migrations table with risk badges + status
  - Sidebar: Overview, Schema Security, Migration Risk, Vault Access, Settings

PAGE 2 — /projects/[id]/graph (Schema Security)
  - D3.js force graph
  - Nodes: Services (dark circles) + Tables (colored circles)
  - Edges: dependency lines (solid + dashed)
  - Colors: green table = healthy, red table = critical risk
  - Legend: Service, Table, Critical Risk
  - Bottom bar shows hovered item URL

PAGE 3 — /migrations/[id] (Migration Detail)
  - Breadcrumb: Projects > Production-V2 > Migrations
  - Migration title: "Expand 'orders' JSONB field"
  - Author + time: k_yamamoto · 2 hours ago
  - SQL file viewer with syntax highlighting
  - Detected Changes table: TYPE | OBJECT | TARGET | IMPACT
  - Right panel: Risk Assessment (H badge = High Risk Level 4)
    "Locking Threat — SEVERE" banner
  - AI Guardian Insight panel:
    → Live stat: "orders table 1.2k req/sec"
    → "Transaction wraparound protection is active"
  - Approve & Deploy / Reject Migration buttons

PAGE 4 — /vault (Vault Access)
  - Stats: Stored Secrets (24), Active Access Grants (11), Rotations Due (02)
  - Secret Inventory table: name | type | scope | last rotated | status | actions
  - Status badges: ACTIVE, EXPIRING, REVOKED
  - Access Policy section
  - "Add Secret" button

## WHAT BACKEND NEEDS TO PROVIDE FOR EACH PAGE

Dashboard needs:
  GET /api/stats/overview → { totalMigrations, affectedServices, activeProjects, migrationsByRisk[] }
  GET /api/migrations/recent?limit=10 → recent migrations list
  GET /api/advisor/insights → proactive AI insights list
  POST /advisor/chat → chat message → AI reply

Schema Security (graph) needs:
  GET /api/projects/{id}/graph → { nodes[], edges[] }
  nodes: [{ id, name, type: 'service'|'table', riskLevel }]
  edges: [{ source, target, type: 'solid'|'dashed' }]

Migration Detail needs:
  GET /api/migrations/{id} → full migration object with:
    { id, title, author, createdAt, filePath, fileContent,
      detectedChanges[], riskLevel, riskScore, locking threats,
      aiInsights[], liveDbStats: { reqPerSec, vacuumActive } }
  POST /api/migrations/{id}/approve → approve + trigger deploy
  POST /api/migrations/{id}/reject → reject with reason

Vault Access needs:
  GET /api/vault/secrets → list of secrets (name, type, scope, lastRotated, status)
  POST /api/vault/secrets → add new secret
  PUT /api/vault/secrets/{id}/rotate → trigger rotation
  GET /api/vault/stats → { storedSecrets, activeGrants, rotationsDue }

## THE KEY INSIGHT: LIVE DB STATS

In Migration Detail, AI Guardian shows:
  "Table orders is currently experiencing 1.2k req/sec"
  "Transaction wraparound protection is active"

This means SchemaGuard connects DIRECTLY to the customer's PostgreSQL database
and queries pg_stat_user_tables, pg_stat_activity etc.

This is NOT from codebase scanning — this is live DB introspection.
This changes the architecture significantly (see backend section).