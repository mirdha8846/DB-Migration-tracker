# ════════════════════════════════════════════════════════════════
#  SERVICE: schema-analyzer
#  ROLE: Parse SQL/HCL migration files. Detect change types.
#        Publish events to Kafka.
# ════════════════════════════════════════════════════════════════

# ── CURSOR PROMPT ───────────────────────────────────────────────
"""
Create a Spring Boot 3.3 Schema Analyzer microservice:

PACKAGE STRUCTURE:
com.schemaguard.analyzer
├── SchemaAnalyzerApplication.java
├── config/
│   └── KafkaProducerConfig.java   # Kafka template config
├── controller/
│   └── WebhookController.java     # POST /webhook/github
├── service/
│   ├── GitHubWebhookService.java  # Validate HMAC signature, extract PR files
│   ├── MigrationParserService.java
│   └── SchemaChangeDetector.java
├── parser/
│   ├── SqlMigrationParser.java    # Parse .sql files
│   ├── HclMigrationParser.java    # Parse Atlas .hcl files (basic regex)
│   └── FlywayMigrationParser.java # Parse V1__name.sql naming convention
├── model/
│   ├── Migration.java             # JPA entity
│   ├── SchemaChange.java          # JPA entity
│   └── dto/
│       ├── GitHubPrEvent.java     # Deserialize GitHub webhook payload
│       ├── DetectedChange.java    # { changeType, tableName, columnName, riskLevel }
│       └── AnalysisCompleteEvent.java  # Published to Kafka
└── kafka/
    └── SchemaChangeProducer.java  # Publish to topic: schema.analysis.complete

MIGRATION PARSING RULES (implement exactly):
SqlMigrationParser must detect:
  - RENAME COLUMN → changeType: "rename_column", risk: HIGH
  - DROP COLUMN   → changeType: "drop_column",   risk: CRITICAL
  - DROP TABLE    → changeType: "drop_table",     risk: CRITICAL
  - ADD COLUMN NOT NULL (no default) → changeType: "add_column_not_null", risk: HIGH
  - ALTER COLUMN TYPE → changeType: "alter_column_type", risk: HIGH
  - ADD COLUMN (nullable) → changeType: "add_column", risk: LOW
  - CREATE TABLE  → changeType: "create_table",   risk: LOW
  - CREATE INDEX  → changeType: "add_index",      risk: LOW
  - DROP INDEX    → changeType: "drop_index",      risk: MEDIUM

Use regex patterns. Store all detected changes in schema_changes table.

GITHUB WEBHOOK:
- Validate X-Hub-Signature-256 header using HMAC-SHA256
- Only process "pull_request" events where action = "opened" or "synchronize"
- Filter files where path contains "/migrations/" or name matches V[0-9]+__*.sql
- Fetch file content via GitHub API using stored repo token

KAFKA EVENT (publish after parsing):
Topic: schema.analysis.complete
Payload: {
  migrationId: UUID,
  projectId: UUID,
  changes: [DetectedChange],
  prNumber: int,
  prUrl: string,
  repoUrl: string,
  overallRisk: "low|medium|high|critical"
}

Use spring.kafka.bootstrap-servers=${KAFKA_HOST:localhost}:9092
"""

# ── RISK CALCULATION LOGIC ───────────────────────────────────────
# Implement in SchemaChangeDetector.java
#
# If ANY change is CRITICAL → overall = CRITICAL
# Else if ANY change is HIGH → overall = HIGH
# Else if ANY change is MEDIUM → overall = MEDIUM
# Else → overall = LOW
#
# Special case: DROP COLUMN + large table (>1M rows estimated)
# → Escalate to CRITICAL with note about lock duration
