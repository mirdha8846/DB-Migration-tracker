# ════════════════════════════════════════════════════════════════
#  SERVICE: codebase-scanner
#  ROLE: Clone repos. Use Tree-sitter to find all usages of
#        affected tables/columns. Build dependency_graph.
# ════════════════════════════════════════════════════════════════

# ── CURSOR PROMPT ───────────────────────────────────────────────
"""
Create a Spring Boot 3.3 Codebase Scanner microservice:

PACKAGE STRUCTURE:
com.schemaguard.scanner
├── CodebaseScannerApplication.java
├── config/
│   ├── KafkaConsumerConfig.java
│   └── TemporalConfig.java         # Temporal client setup
├── kafka/
│   └── AnalysisEventConsumer.java  # Consume schema.analysis.complete
├── temporal/
│   ├── ScanWorkflow.java           # @WorkflowInterface
│   ├── ScanWorkflowImpl.java       # Orchestrate: clone → scan → save → notify
│   └── activities/
│       ├── RepoCloneActivity.java       # @ActivityInterface
│       ├── RepoCloneActivityImpl.java   # git clone via JGit
│       ├── AstScanActivity.java
│       ├── AstScanActivityImpl.java     # Tree-sitter scanning
│       └── DependencyGraphActivity.java # Save to DB
├── scanner/
│   ├── TreeSitterScanner.java      # Core AST scanner
│   ├── JavaScanner.java            # Java-specific patterns
│   ├── PythonScanner.java          # Python-specific patterns
│   ├── GoScanner.java
│   └── TypeScriptScanner.java
├── model/
│   ├── DependencyGraph.java        # JPA entity
│   └── dto/
│       ├── ScanRequest.java
│       ├── UsageMatch.java         # { filePath, lineNumber, snippet, usageType }
│       └── ScanCompleteEvent.java  # Published to kafka: scan.complete
└── util/
    └── GitRepoManager.java         # Clone, update, cleanup repos

TEMPORAL WORKFLOW (implement exactly):
ScanWorkflow:
  1. Activity: CloneAllRegisteredRepos(projectId)
     - Use JGit to clone or git pull each registered repo
     - Store in /tmp/sg-repos/{projectId}/{repoName}/
     - Timeout: 5 minutes per repo

  2. Activity: ScanAllRepos(changes, repoList)
     - For each change (tableName, columnName)
     - Scan every repo with TreeSitterScanner
     - Collect all UsageMatch results
     - Timeout: 10 minutes

  3. Activity: SaveDependencyGraph(projectId, matches)
     - Upsert into dependency_graph table
     - Mark is_dynamic=false (AI agent will update later)

  4. Activity: PublishScanComplete(scanResult)
     - Kafka topic: scan.complete

TREE-SITTER SCANNING STRATEGY:
Since Tree-sitter Java bindings are complex, use this simplified but effective approach:

For Java repos, scan for:
  1. String literals containing table/column name
     Pattern: ".*{tableName}.*" in SQL strings
  2. JPA @Table(name="{tableName}") annotations
  3. @Column(name="{columnName}") annotations
  4. Named queries with table references
  5. Repository method names (findByEmail → implies users.email)

For Python repos:
  1. SQLAlchemy model class with __tablename__ = "{tableName}"
  2. Column("{columnName}") calls
  3. Raw SQL strings with table/column name
  4. Django model field names matching column

For each match, capture:
  - filePath (relative to repo root)
  - lineNumber
  - 3 lines of context (before, match, after) as code_snippet
  - usageType: SELECT | INSERT | UPDATE | DELETE | JOIN | ORM_MODEL | ANNOTATION

USE JGIT for git operations:
dependency: org.eclipse.jgit:org.eclipse.jgit:6.9.0.202403050737-r
"""
