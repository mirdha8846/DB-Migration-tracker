# ════════════════════════════════════════════════════════════════
#  SERVICE: notification-service
#  ROLE: Post GitHub PR comments. Send Slack messages. Email.
# ════════════════════════════════════════════════════════════════

"""
Create a Spring Boot 3.3 Notification Service:

PACKAGE STRUCTURE:
com.schemaguard.notification
├── NotificationApplication.java
├── config/
│   └── KafkaConsumerConfig.java
├── kafka/
│   └── AiAnalysisConsumer.java     # Consume ai.analysis.complete
├── service/
│   ├── GitHubNotificationService.java
│   ├── SlackNotificationService.java
│   └── NotificationOrchestratorService.java
└── model/
    └── dto/
        └── ImpactReportSummary.java

GitHubNotificationService:
  POST to https://api.github.com/repos/{owner}/{repo}/issues/{prNumber}/comments
  Headers: Authorization: Bearer {GITHUB_TOKEN}

  Format the comment as GitHub Markdown:

  ## 🛡️ SchemaGuard Impact Report

  **Migration:** `{fileName}`
  **Overall Risk:** 🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🟢 LOW

  ### Changes Detected
  | Change | Table | Column | Risk |
  |--------|-------|--------|------|
  | {changeType} | {table} | {column} | {risk} |

  ### Affected Services ({count})
  {for each service}
  **{serviceName}** — `{filePath}:{lineNumber}`
  > {issue}
  > **Fix:** {fix}

  ### Deploy Order
  {numbered list from ai_fix_steps}

  ---
  *Powered by SchemaGuard · [View full report]({dashboardUrl})*

SlackNotificationService:
  Slack Incoming Webhook URL from env
  Message format (Block Kit):
  - Header block with risk emoji + migration name
  - Section with affected service count
  - Button linking to dashboard report

TRIGGER LOGIC in NotificationOrchestratorService:
  On ai.analysis.complete event:
  1. If prNumber exists → post GitHub comment
  2. If risk = HIGH or CRITICAL → send Slack
  3. Update impact_reports: posted_to_github=true, posted_to_slack=true
"""

---

# ════════════════════════════════════════════════════════════════
#  SERVICE: report-service
#  ROLE: CRUD for projects, repos, migrations, reports.
#        REST API consumed by the Next.js dashboard.
# ════════════════════════════════════════════════════════════════

"""
Create a Spring Boot 3.3 Report Service:

PACKAGE STRUCTURE:
com.schemaguard.report
├── ReportApplication.java
├── controller/
│   ├── ProjectController.java
│   ├── RepoController.java
│   ├── MigrationController.java
│   ├── ReportController.java
│   ├── PolicyController.java
│   └── DependencyGraphController.java
├── service/
│   ├── ProjectService.java
│   ├── ReportService.java
│   └── DependencyGraphService.java
├── repository/ (Spring Data JPA)
│   ├── ProjectRepository.java
│   ├── MigrationRepository.java
│   ├── ImpactReportRepository.java
│   └── DependencyGraphRepository.java
└── model/ (JPA entities matching seed-db.sql tables)

REST ENDPOINTS:

Projects:
  GET    /api/projects                     # List tenant's projects
  POST   /api/projects                     # Create project
  GET    /api/projects/{id}               # Project details
  DELETE /api/projects/{id}

Repos:
  GET    /api/projects/{id}/repos          # List registered repos
  POST   /api/projects/{id}/repos          # Register new repo
  DELETE /api/projects/{id}/repos/{repoId}

Migrations:
  GET    /api/projects/{id}/migrations     # List migrations (paginated)
  GET    /api/migrations/{id}             # Migration detail

Reports:
  GET    /api/reports/{migrationId}       # Full impact report
  GET    /api/projects/{id}/reports       # All reports (paginated)
  GET    /api/projects/{id}/reports/stats # { total, critical, high, medium, low }

Dependency Graph:
  GET    /api/projects/{id}/graph         # Full dep graph
  GET    /api/projects/{id}/graph/table/{tableName}  # Services using this table

Policies:
  GET    /api/projects/{id}/policies
  POST   /api/projects/{id}/policies
  PUT    /api/projects/{id}/policies/{policyId}
  DELETE /api/projects/{id}/policies/{policyId}

All endpoints extract tenantId from JWT header (X-Tenant-ID set by gateway).
All list endpoints support: ?page=0&size=20&sort=createdAt,desc
All responses follow: { data: T, meta: { page, size, total } }
"""
