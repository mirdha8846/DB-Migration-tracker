import db from "../config/db";
import { callDeepseek } from "./deepseek-agent";

// ─── Types ──────────────────────────────────────────────────────

export interface TableInfo {
  name: string;
  rowEstimate: number;
  sizeEstimate: string;
  columns: string[];
  foreignKeys: Array<{ column: string; refTable: string; refColumn: string }>;
  usageCount: number;
  serviceCount: number;
  hasHeavyWrites: boolean;
}

export interface SmartAnalysis {
  migrationId?: string;
  fileName: string;
  rawSql: string;
  parsedChanges: ParsedChange[];
  riskScore: number;          // 0-100
  overallRisk: "low" | "medium" | "high" | "critical";
  lockingThreat: "LOW" | "MODERATE" | "SEVERE" | "HIGH";
  typeConflicts: TypeConflict[];
  crossTableWarnings: CrossTableWarning[];
  safetyChecks: SafetyCheck[];
  rollbackSql: string;
  aiInsights: string[];
  recommendations: Recommendation[];
  deployOrder: string[];
  prerequisiteChecks: PrerequisiteCheck[];
  estimatedDowntime: string;
}

export interface ParsedChange {
  changeType: string;
  tableName: string;
  columnName?: string;
  oldValue?: string;
  newValue?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  lockingThreat?: "LOW" | "MODERATE" | "SEVERE" | "HIGH";
  reason: string;
  aiConfidence?: number;
}

interface TypeConflict {
  tableName: string;
  columnName: string;
  fromType: string;
  toType: string;
  isCompatible: boolean;
  dataLossPossible: boolean;
  recommendation: string;
}

interface CrossTableWarning {
  columnName: string;
  changedInTable: string;
  sameColumnInTables: string[];
  affectedServicesPerTable: Record<string, string[]>;
  warning: string;
}

interface SafetyCheck {
  check: string;
  passed: boolean;
  severity: "info" | "warning" | "critical";
  message: string;
}

interface Recommendation {
  category: "pre_migration" | "during_migration" | "post_migration";
  priority: "must" | "should" | "consider";
  action: string;
  reason: string;
}

interface PrerequisiteCheck {
  check: string;
  command: string;
  description: string;
}

// ─── Regex patterns for known SQL operations ────────────────────

interface DetectionRule {
  regex: RegExp;
  changeType: string;
  baseRisk: "low" | "medium" | "high" | "critical";
  lockingThreat?: "LOW" | "MODERATE" | "SEVERE" | "HIGH";
  reason: string;
}

const KNOWN_PATTERNS: DetectionRule[] = [
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+(\w+)/i, changeType: "drop_column", baseRisk: "high", reason: "Column will be removed with data" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+(\w+)/i, changeType: "drop_column", baseRisk: "critical", lockingThreat: "SEVERE", reason: "Data loss: column permanently deleted. NOT idempotent." },
  { regex: /DROP\s+TABLE\s+IF\s+EXISTS\s+(\w+)\s+CASCADE/i, changeType: "drop_table_cascade", baseRisk: "critical", lockingThreat: "SEVERE", reason: "Table removal with cascading FK deletes" },
  { regex: /DROP\s+TABLE\s+IF\s+EXISTS\s+(\w+)/i, changeType: "drop_table", baseRisk: "critical", lockingThreat: "SEVERE", reason: "Table permanently removed" },
  { regex: /DROP\s+TABLE\s+(?!IF\s+EXISTS)(\w+)/i, changeType: "drop_table", baseRisk: "critical", lockingThreat: "SEVERE", reason: "NOT idempotent — will fail if table doesn't exist" },
  { regex: /TRUNCATE\s+TABLE\s+(\w+)/i, changeType: "truncate_table", baseRisk: "critical", lockingThreat: "SEVERE", reason: "All data instantly wiped" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+RENAME\s+COLUMN\s+(\w+)\s+TO\s+(\w+)/i, changeType: "rename_column", baseRisk: "high", reason: "All code referencing old column name will break" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+TYPE\s+(\w+)/i, changeType: "alter_column_type", baseRisk: "high", lockingThreat: "SEVERE", reason: "Type change: table rewrite required, potential data loss" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+SET\s+DATA\s+TYPE\s+(\w+)/i, changeType: "alter_column_type", baseRisk: "high", lockingThreat: "SEVERE", reason: "Type change: table rewrite required" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+(\w+)\s+NOT\s+NULL\s+DEFAULT\s+(.+)/i, changeType: "add_column_not_null_default", baseRisk: "high", lockingThreat: "HIGH", reason: "NOT NULL with default: adds column but valid" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+(\w+)\s+NOT\s+NULL/i, changeType: "add_column_not_null", baseRisk: "high", lockingThreat: "HIGH", reason: "NOT NULL without default: fails if table has rows" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+SET\s+NOT\s+NULL/i, changeType: "set_not_null", baseRisk: "high", lockingThreat: "HIGH", reason: "Will fail if any NULL values exist" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+DROP\s+NOT\s+NULL/i, changeType: "drop_not_null", baseRisk: "low", reason: "Relaxing constraint — safe" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+(\w+)/i, changeType: "add_column", baseRisk: "low", reason: "Idempotent column addition" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+(\w+)/i, changeType: "add_column", baseRisk: "low", reason: "New column, no data migration needed" },
  { regex: /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(\w+)/i, changeType: "create_table", baseRisk: "low", reason: "New table creation — no existing data to affect" },
  { regex: /CREATE\s+TABLE\s+(?!IF)(\w+)/i, changeType: "create_table", baseRisk: "low", reason: "New table — will fail if already exists" },
  { regex: /CREATE\s+INDEX\s+CONCURRENTLY\s+(\w+)\s+ON\s+(\w+)/i, changeType: "add_index_concurrent", baseRisk: "low", reason: "Concurrent index — no write blocking" },
  { regex: /CREATE\s+UNIQUE\s+INDEX\s+CONCURRENTLY\s+(\w+)\s+ON\s+(\w+)/i, changeType: "add_unique_index_concurrent", baseRisk: "low", reason: "Concurrent unique index" },
  { regex: /CREATE\s+UNIQUE\s+INDEX\s+(\w+)\s+ON\s+(\w+)/i, changeType: "add_unique_index", baseRisk: "medium", lockingThreat: "SEVERE", reason: "Unique index without CONCURRENTLY — blocks writes" },
  { regex: /CREATE\s+INDEX\s+(?!CONCURRENTLY)(\w+)\s+ON\s+(\w+)/i, changeType: "add_index", baseRisk: "medium", lockingThreat: "SEVERE", reason: "Index without CONCURRENTLY — blocks writes. Use CREATE INDEX CONCURRENTLY instead." },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+CONSTRAINT\s+(\w+)/i, changeType: "drop_constraint", baseRisk: "medium", reason: "Constraint removal — check if it's a FK/PK" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY\s*\((\w+)\)\s*REFERENCES\s+(\w+)\s*\((\w+)\)/i, changeType: "add_foreign_key", baseRisk: "medium", reason: "FK addition — validates existing data" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+PRIMARY\s+KEY/i, changeType: "add_primary_key", baseRisk: "medium", lockingThreat: "SEVERE", reason: "PK addition — table rewrite, validates uniqueness" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+UNIQUE/i, changeType: "add_unique_constraint", baseRisk: "medium", lockingThreat: "SEVERE", reason: "Unique constraint — validates all existing rows" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT/i, changeType: "add_constraint", baseRisk: "low", reason: "Generic constraint" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ENABLE\s+TRIGGER\s+(\w+)/i, changeType: "enable_trigger", baseRisk: "low", reason: "Enabling trigger" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DISABLE\s+TRIGGER\s+(\w+)/i, changeType: "disable_trigger", baseRisk: "medium", reason: "Disabling trigger — data integrity risk" },
  { regex: /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+)/i, changeType: "create_function", baseRisk: "low", reason: "Function replacement" },
  { regex: /CREATE\s+OR\s+REPLACE\s+VIEW\s+(\w+)/i, changeType: "create_view", baseRisk: "low", reason: "View replacement" },
  { regex: /DROP\s+VIEW\s+(\w+)/i, changeType: "drop_view", baseRisk: "medium", reason: "View removal — dependent objects will break" },
  { regex: /DROP\s+FUNCTION\s+(\w+)/i, changeType: "drop_function", baseRisk: "medium", reason: "Function removal — callers will break" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+INDEX\s+(\w+)/i, changeType: "drop_index", baseRisk: "medium", reason: "Index removal — query performance may degrade" },
  { regex: /DROP\s+INDEX\s+(\w+)/i, changeType: "drop_index", baseRisk: "medium", reason: "Index removal" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+SET\s+SCHEMA\s+(\w+)/i, changeType: "set_schema", baseRisk: "high", reason: "Schema change — all references break" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+RENAME\s+TO\s+(\w+)/i, changeType: "rename_table", baseRisk: "high", reason: "Table rename — all code references break" },
  { regex: /COMMENT\s+ON\s+COLUMN\s+(\w+)\.(\w+)/i, changeType: "comment_on_column", baseRisk: "low", reason: "Metadata only" },
];

// ─── Type Compatibility ─────────────────────────────────────────

const TYPE_CATEGORIES: Record<string, string[]> = {
  numeric: ["smallint", "integer", "int", "bigint", "decimal", "numeric", "real", "double precision", "serial", "bigserial", "float"],
  text: ["varchar", "char", "text", "character varying", "character", "varying", "bpchar", "name"],
  boolean: ["boolean", "bool"],
  datetime: ["timestamp", "timestamptz", "date", "time", "timetz", "interval", "timestamp without time zone", "timestamp with time zone"],
  binary: ["bytea", "blob"],
  json: ["json", "jsonb"],
  uuid: ["uuid"],
  array: ["array"],
};

function getTypeCategory(type: string): string {
  const lower = type.replace(/\([^)]*\)/g, "").trim().toLowerCase();
  for (const [category, types] of Object.entries(TYPE_CATEGORIES)) {
    if (types.some((t) => lower.startsWith(t) || lower.includes(t))) return category;
  }
  return "unknown";
}

function checkTypeCompatibility(
  fromType: string,
  toType: string,
): { compatible: boolean; dataLoss: boolean; recommendation: string } {
  const fromCat = getTypeCategory(fromType);
  const toCat = getTypeCategory(toType);

  if (fromCat === toCat) {
    // Same category — check narrowing
    if (fromCat === "numeric") {
      return { compatible: true, dataLoss: false, recommendation: "Numeric type change — verify value range fits in target type" };
    }
    if (fromCat === "text") {
      const fromLen = parseInt((fromType.match(/\((\d+)\)/) || [])[1] || "0");
      const toLen = parseInt((toType.match(/\((\d+)\)/) || [])[1] || "0");
      if (toLen && fromLen > toLen) {
        return { compatible: false, dataLoss: true, recommendation: `⚠️ Truncation risk: VARCHAR(${fromLen}) → VARCHAR(${toLen}). ${fromLen - toLen} chars may be lost.` };
      }
      return { compatible: true, dataLoss: false, recommendation: "Text type change — no data loss expected" };
    }
    return { compatible: true, dataLoss: false, recommendation: "Same type category — compatible" };
  }

  // Cross-category: check for data loss
  if (fromCat === "text" && toCat === "json") {
    return { compatible: false, dataLoss: true, recommendation: "⚠️ TEXT → JSON: existing data may not be valid JSON. Validate with: SELECT * FROM table WHERE column IS NOT NULL AND column::jsonb IS NULL" };
  }
  if (fromCat === "json" && toCat === "text") {
    return { compatible: true, dataLoss: false, recommendation: "JSON → TEXT: data preserved but loses JSON indexing" };
  }
  if (fromCat !== toCat) {
    return { compatible: false, dataLoss: true, recommendation: `⚠️ Type conversion: ${fromType.toUpperCase()} → ${toType.toUpperCase()}. Data loss possible. Test with sample data first.` };
  }

  return { compatible: true, dataLoss: false, recommendation: "Type change appears compatible" };
}

// ─── Smart SQL Parser ──────────────────────────────────────────

export async function analyzeMigration(
  sql: string,
  fileName: string,
  projectId: string,
  tableStats?: Record<string, TableInfo>,
): Promise<SmartAnalysis> {
  const changes = parseSqlToChanges(sql);
  const knownCount = changes.length;

  // For any SQL not matching known patterns → AI analysis
  const unmatchedLines = findUnmatchedStatements(sql, changes);
  let aiChanges: ParsedChange[] = [];
  let aiInsights: string[] = [];

  if (unmatchedLines.length > 0) {
    console.log(`🤖 ${unmatchedLines.length} unknown statements → Deepseek analysis`);
    const aiResult = await aiAnalyzeUnknownSQL(unmatchedLines, fileName);
    aiChanges = aiResult.changes;
    aiInsights = aiResult.insights;
  }

  const allChanges = [...changes, ...aiChanges];
  const riskScore = calculateRiskScore(allChanges, tableStats);
  const typeConflicts = detectTypeConflicts(sql);
  const crossTableWarnings = await checkCrossTableColumns(projectId, allChanges);
  const safetyChecks = runSafetyChecks(sql, allChanges, tableStats);
  const recommendations = generateRecommendations(allChanges, tableStats, typeConflicts);
  const rollbackSql = generateRollbackSql(allChanges, sql);
  const prerequisites = generatePrerequisites(allChanges, tableStats);
  const lockingThreat = getMaxLockingThreat(allChanges);

  const downtime = estimateDowntime(allChanges, tableStats);

  return {
    fileName,
    rawSql: sql,
    parsedChanges: allChanges,
    riskScore,
    overallRisk: riskScore >= 80 ? "critical" : riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low",
    lockingThreat,
    typeConflicts,
    crossTableWarnings,
    safetyChecks,
    rollbackSql,
    aiInsights,
    recommendations,
    deployOrder: generateDeployOrder(allChanges, recommendations),
    prerequisiteChecks: prerequisites,
    estimatedDowntime: downtime,
  };
}

// ─── Known Pattern Parser ──────────────────────────────────────

function parseSqlToChanges(sql: string): ParsedChange[] {
  const lines = sql.split("\n");
  const changes: ParsedChange[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;

    for (const rule of KNOWN_PATTERNS) {
      const match = trimmed.match(rule.regex);
      if (!match) continue;

      let tableName = "";
      let columnName: string | undefined;
      let oldValue: string | undefined;
      let newValue: string | undefined;

      if (["drop_table", "drop_table_cascade", "create_table", "truncate_table", "rename_table"].includes(rule.changeType)) {
        tableName = match[1];
      } else if (rule.changeType === "rename_column") {
        tableName = match[1];
        columnName = match[2];
        oldValue = match[2];
        newValue = match[3];
      } else if (rule.changeType === "alter_column_type") {
        tableName = match[1];
        columnName = match[2];
        oldValue = "existing";
        newValue = match[3];
      } else if (["drop_index"].includes(rule.changeType) && match.length === 2) {
        columnName = match[1];
        tableName = "unknown";
      } else if (match[1] && match[2]) {
        tableName = match[1];
        columnName = match[2];
      }

      const key = `${rule.changeType}:${tableName}:${columnName || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);

      changes.push({
        changeType: rule.changeType,
        tableName,
        columnName,
        oldValue,
        newValue,
        riskLevel: rule.baseRisk,
        lockingThreat: rule.lockingThreat,
        reason: rule.reason,
      });
    }
  }

  return changes;
}

// ─── Unknown Statement Detection ───────────────────────────────

function findUnmatchedStatements(sql: string, matched: ParsedChange[]): string[] {
  const lines = sql.split("\n");
  const unmatched: string[] = [];
  const matchedLines = new Set<number>();

  // Mark matched lines
  for (const change of matched) {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.includes(change.tableName) && trimmed.includes(change.changeType.replace(/_/g, " "))) {
        matchedLines.add(i);
        break;
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("--")) continue;
    if (matchedLines.has(i)) continue;

    // Check if line looks like SQL
    if (/^\s*(ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|SET|GRANT|REVOKE|VACUUM|ANALYZE|REINDEX|CLUSTER|COPY|BEGIN|COMMIT|ROLLBACK|LOCK|TRUNCATE|REFRESH|NOTIFY|LISTEN|UNLISTEN|DO|EXPLAIN|PREPARE|EXECUTE|DEALLOCATE|DECLARE|FETCH|MOVE|CLOSE|DISCARD)\s/i.test(trimmed)) {
      unmatched.push(trimmed);
    }
  }

  return unmatched;
}

// ─── AI-Powered Analysis for Unknown SQL ───────────────────────

async function aiAnalyzeUnknownSQL(
  statements: string[],
  fileName: string,
): Promise<{ changes: ParsedChange[]; insights: string[] }> {
  const prompt = `Analyze these SQL statements from migration file "${fileName}":

${statements.join("\n")}

For each statement, determine:
1. What change it makes (type, table, column if applicable)
2. What the risk level is (low/medium/high/critical) and WHY
3. Whether it will cause locking or blocking
4. If there are any hidden dangers (data loss, performance, cascading effects)
5. What could go wrong in production

Respond as JSON with EXACTLY this structure:
{
  "changes": [
    {
      "changeType": "snake_case_type",
      "tableName": "table_name",
      "columnName": "column or null",
      "riskLevel": "low|medium|high|critical",
      "lockingThreat": "LOW|MODERATE|SEVERE|HIGH or null",
      "reason": "why this risk level",
      "aiConfidence": 0.0-1.0
    }
  ],
  "insights": ["insight 1", "insight 2"]
}`;

  try {
    const response = await callDeepseek("You are a PostgreSQL migration safety expert. Analyze SQL and identify risks.", prompt, 2000);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        changes: (parsed.changes || []).map((c: any) => ({
          changeType: c.changeType || "unknown",
          tableName: c.tableName || "unknown",
          columnName: c.columnName || undefined,
          riskLevel: c.riskLevel || "medium",
          lockingThreat: c.lockingThreat || undefined,
          reason: c.reason || "AI-analyzed statement",
          aiConfidence: c.aiConfidence || 0.7,
        })),
        insights: parsed.insights || [],
      };
    }
  } catch (err) {
    console.error("AI analysis failed:", err);
  }

  return {
    changes: statements.map((s, i) => ({
      changeType: "unknown_sql",
      tableName: "unknown",
      columnName: undefined,
      riskLevel: "medium" as const,
      reason: `Unrecognized SQL (${s.substring(0, 50)}...) — manual review recommended`,
      aiConfidence: 0.3,
    })),
    insights: ["Manual review recommended for unrecognized SQL statements"],
  };
}

// ─── Risk Score Calculator ─────────────────────────────────────

function calculateRiskScore(changes: ParsedChange[], tableStats?: Record<string, TableInfo>): number {
  let score = 0;

  for (const change of changes) {
    // Base risk
    const baseScores: Record<string, number> = {
      critical: 40, high: 25, medium: 10, low: 2,
    };
    score += baseScores[change.riskLevel] || 5;

    // Locking threat amplification
    const lockScores: Record<string, number> = { SEVERE: 20, HIGH: 10, MODERATE: 5 };
    score += lockScores[change.lockingThreat || ""] || 0;

    // Table size amplification
    if (tableStats && change.tableName && tableStats[change.tableName]) {
      const stats = tableStats[change.tableName];
      if (stats.rowEstimate > 50_000_000) score += 25;
      else if (stats.rowEstimate > 10_000_000) score += 15;
      else if (stats.rowEstimate > 1_000_000) score += 8;

      if (stats.hasHeavyWrites) score += 10;
      if (stats.serviceCount >= 5) score += 10;
    }

    // Data loss potential
    if (["drop_table", "drop_table_cascade", "drop_column", "truncate_table"].includes(change.changeType)) {
      score += 20;
    }

    // AI confidence penalty (low confidence = higher risk)
    if (change.aiConfidence && change.aiConfidence < 0.5) score += 10;
  }

  return Math.min(100, score);
}

// ─── Type Conflict Detection ───────────────────────────────────

function detectTypeConflicts(sql: string): TypeConflict[] {
  const conflicts: TypeConflict[] = [];

  // ALTER COLUMN TYPE changes
  const alterTypeRegex = /ALTER\s+TABLE\s+(\w+)\s+(?:ALTER|MODIFY)\s+COLUMN\s+(\w+)\s+(?:TYPE|SET\s+DATA\s+TYPE)\s+(\w+(?:\(\d+(?:,\d+)?\))?(?:\s+ARRAY)?)/gi;
  // Also: ALTER COLUMN TYPE
  const alterTypeRegex2 = /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+TYPE\s+(\w+(?:\(\d+(?:,\d+)?\))?(?:\s+ARRAY)?)/gi;

  for (const regex of [alterTypeRegex, alterTypeRegex2]) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sql)) !== null) {
      const tableName = match[1];
      const columnName = match[2];
      const toType = match[3];

      const compat = checkTypeCompatibility("unknown", toType);
      conflicts.push({
        tableName,
        columnName,
        fromType: "current",
        toType,
        isCompatible: compat.compatible,
        dataLossPossible: compat.dataLoss,
        recommendation: compat.recommendation,
      });
    }
  }

  return conflicts;
}

// ─── Safety Checks ─────────────────────────────────────────────

function runSafetyChecks(
  sql: string,
  changes: ParsedChange[],
  tableStats?: Record<string, TableInfo>,
): SafetyCheck[] {
  const checks: SafetyCheck[] = [];

  // 1. Idempotency check
  const hasIfNotExists = /IF\s+NOT\s+EXISTS/i.test(sql);
  const hasIfExists = /IF\s+EXISTS/i.test(sql);
  const isDestructive = changes.some((c) =>
    ["drop_table", "drop_column", "truncate_table", "drop_index"].includes(c.changeType),
  );

  checks.push({
    check: "Idempotency",
    passed: hasIfNotExists || hasIfExists || !isDestructive,
    severity: isDestructive ? "critical" : "info",
    message: isDestructive
      ? hasIfExists
        ? "✅ Uses IF EXISTS — safe for re-runs"
        : "⚠️ NOT idempotent: will fail on re-run if objects don't exist. Add IF EXISTS."
      : "✅ Safe to run multiple times",
  });

  // 2. CASCADE check
  const hasCascade = /CASCADE/i.test(sql);
  if (hasCascade) {
    checks.push({
      check: "CASCADE Operations",
      passed: false,
      severity: "critical",
      message: "⚠️ CASCADE detected: dependent objects will be automatically dropped. Review all FK relationships.",
    });
  }

  // 3. Large table operations
  for (const change of changes) {
    if (tableStats && change.tableName && tableStats[change.tableName]) {
      const stats = tableStats[change.tableName];
      if (stats.rowEstimate > 1_000_000) {
        checks.push({
          check: `Large Table: ${change.tableName}`,
          passed: false,
          severity: "warning",
          message: `⚠️ Table "${change.tableName}" has ~${stats.rowEstimate.toLocaleString()} rows. This operation may take minutes/hours. Consider batching.`,
        });
      }

      if (stats.serviceCount >= 3) {
        checks.push({
          check: `Multi-Service Impact: ${change.tableName}`,
          passed: false,
          severity: "warning",
          message: `⚠️ "${change.tableName}" used by ${stats.serviceCount} services. Coordinate deployment with all teams.`,
        });
      }
    }
  }

  // 4. Backup recommendation for destructive operations
  if (isDestructive && changes.some((c) => c.changeType.includes("drop"))) {
    checks.push({
      check: "Backup Recommended",
      passed: false,
      severity: "critical",
      message: "🛑 Destructive operation detected. Take a backup before running this migration.",
    });
  }

  // 5. Transaction safety
  const hasConcurrentIndex = /CREATE\s+INDEX\s+CONCURRENTLY/i.test(sql);
  if (hasConcurrentIndex) {
    checks.push({
      check: "Transaction Safety",
      passed: false,
      severity: "warning",
      message: "⚠️ CREATE INDEX CONCURRENTLY cannot run inside a transaction. Run this migration outside a transaction block.",
    });
  }

  return checks;
}

// ─── Rollback SQL Generator ────────────────────────────────────

function generateRollbackSql(changes: ParsedChange[], originalSql: string): string {
  const rollbackLines: string[] = ["-- ROLLBACK MIGRATION", "-- Generated by SchemaGuard", ""];

  for (const change of [...changes].reverse()) {
    switch (change.changeType) {
      case "create_table":
        rollbackLines.push(`DROP TABLE IF EXISTS ${change.tableName} CASCADE;`);
        break;
      case "drop_table":
      case "drop_table_cascade":
        rollbackLines.push(`-- ⚠️ Cannot auto-rollback DROP TABLE "${change.tableName}" — data is permanently lost`);
        rollbackLines.push(`-- Restore from backup: pg_restore -t ${change.tableName} backup.dump`);
        break;
      case "add_column":
      case "add_column_not_null":
      case "add_column_not_null_default":
        rollbackLines.push(`ALTER TABLE ${change.tableName} DROP COLUMN IF EXISTS ${change.columnName};`);
        break;
      case "drop_column":
        rollbackLines.push(`-- ⚠️ Cannot auto-rollback DROP COLUMN "${change.tableName}.${change.columnName}" — data is permanently lost`);
        rollbackLines.push(`-- Restore from backup or recreate column manually`);
        break;
      case "rename_column":
        if (change.newValue) {
          rollbackLines.push(`ALTER TABLE ${change.tableName} RENAME COLUMN ${change.newValue} TO ${change.columnName};`);
        }
        break;
      case "rename_table":
        if (change.newValue) {
          rollbackLines.push(`ALTER TABLE ${change.newValue} RENAME TO ${change.tableName};`);
        }
        break;
      case "add_index":
      case "add_index_concurrent":
      case "add_unique_index":
      case "add_unique_index_concurrent":
        rollbackLines.push(`DROP INDEX IF EXISTS ${change.columnName || change.tableName + "_idx"};`);
        break;
      case "drop_index":
        rollbackLines.push(`-- ⚠️ Index "${change.columnName}" was dropped — recreate from original DDL`);
        break;
      case "add_column_not_null":
        rollbackLines.push(`ALTER TABLE ${change.tableName} ALTER COLUMN ${change.columnName} DROP NOT NULL;`);
        break;
      default:
        rollbackLines.push(`-- Rollback for: ${change.changeType} on ${change.tableName} — review manually`);
    }
  }

  return rollbackLines.join("\n");
}

// ─── Recommendations Generator ─────────────────────────────────

function generateRecommendations(
  changes: ParsedChange[],
  tableStats?: Record<string, TableInfo>,
  typeConflicts?: TypeConflict[],
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Pre-migration checks
  if (changes.some((c) => c.changeType.includes("drop") || c.changeType === "truncate_table")) {
    recs.push({
      category: "pre_migration", priority: "must",
      action: "Take a full database backup (pg_dump) before running this migration",
      reason: "Destructive changes detected — data loss is irreversible",
    });
  }

  if (changes.some((c) => c.changeType === "alter_column_type")) {
    recs.push({
      category: "pre_migration", priority: "must",
      action: "Test type conversion on a staging copy first. Run: SELECT count(*) FROM table WHERE column::new_type IS NULL AND column IS NOT NULL",
      reason: "Type conversion may fail on incompatible data",
    });
  }

  // During migration
  const hasBlockingOperations = changes.some((c) =>
    ["SEVERE", "HIGH"].includes(c.lockingThreat || ""),
  );
  if (hasBlockingOperations) {
    recs.push({
      category: "during_migration", priority: "must",
      action: "Set lock_timeout before running: SET lock_timeout = '5s'",
      reason: "Prevents indefinite blocking of other queries",
    });
    recs.push({
      category: "during_migration", priority: "should",
      action: "Run during low-traffic window (maintenance window)",
      reason: "Blocking operations will impact active users",
    });
  }

  // For large tables
  for (const change of changes) {
    if (tableStats && change.tableName && tableStats[change.tableName]?.rowEstimate > 10_000_000) {
      recs.push({
        category: "during_migration", priority: "must",
        action: `For ${change.tableName} (${tableStats[change.tableName].rowEstimate.toLocaleString()} rows): Use batched approach with pg_batch or manual loops with sleep`,
        reason: "Large table — single ALTER will lock for extended period",
      });
    }
  }

  // Post-migration
  if (changes.some((c) => c.changeType.includes("index"))) {
    recs.push({
      category: "post_migration", priority: "should",
      action: "Run ANALYZE on affected tables to update query planner statistics",
      reason: "New indexes require fresh statistics for optimal query plans",
    });
  }

  recs.push({
    category: "post_migration", priority: "should",
    action: "Monitor pg_stat_user_tables.n_dead_tup for 24h after migration",
    reason: "Schema changes can cause autovacuum spikes",
  });

  return recs;
}

// ─── Helpers ────────────────────────────────────────────────────

function getMaxLockingThreat(changes: ParsedChange[]): SmartAnalysis["lockingThreat"] {
  const threats = changes.map((c) => c.lockingThreat).filter(Boolean) as string[];
  if (threats.includes("SEVERE")) return "SEVERE";
  if (threats.includes("HIGH")) return "HIGH";
  if (threats.includes("MODERATE")) return "MODERATE";
  return "LOW";
}

function estimateDowntime(changes: ParsedChange[], tableStats?: Record<string, TableInfo>): string {
  let maxRows = 0;
  let hasBlocking = false;

  for (const change of changes) {
    if (tableStats && change.tableName && tableStats[change.tableName]) {
      maxRows = Math.max(maxRows, tableStats[change.tableName].rowEstimate);
    }
    if (["SEVERE", "HIGH"].includes(change.lockingThreat || "")) hasBlocking = true;
  }

  if (!hasBlocking) return "No downtime expected (non-blocking operations)";
  if (maxRows === 0) return "Unknown — table metadata not available";
  if (maxRows < 10_000) return "< 1 second";
  if (maxRows < 1_000_000) return "1-10 seconds";
  if (maxRows < 10_000_000) return "30 seconds — 5 minutes";
  if (maxRows < 100_000_000) return "5-30 minutes";
  return "30+ minutes — consider batching strategy";
}

function generateDeployOrder(changes: ParsedChange[], recs: Recommendation[]): string[] {
  const steps: string[] = ["Create backup of affected tables"];

  for (const rec of recs.filter((r) => r.category === "pre_migration")) {
    steps.push(rec.action);
  }

  steps.push("Run migration SQL");

  for (const rec of recs.filter((r) => r.category === "during_migration")) {
    steps.push(rec.action);
  }

  for (const rec of recs.filter((r) => r.category === "post_migration")) {
    steps.push(rec.action);
  }

  steps.push("Verify application health and rollback if needed");
  return steps;
}

function generatePrerequisites(
  changes: ParsedChange[],
  tableStats?: Record<string, TableInfo>,
): PrerequisiteCheck[] {
  const checks: PrerequisiteCheck[] = [];

  if (changes.some((c) => c.changeType === "alter_column_type")) {
    checks.push({
      check: "Type compatibility verification",
      command: `SELECT count(*) FROM table WHERE column::target_type IS NULL AND column IS NOT NULL;`,
      description: "Verify ALL existing values are compatible with new type",
    });
  }

  if (changes.some((c) => c.changeType === "set_not_null")) {
    checks.push({
      check: "NULL value check",
      command: `SELECT count(*) FROM table WHERE column IS NULL;`,
      description: "Verify no NULL values exist before adding NOT NULL constraint",
    });
  }

  if (changes.some((c) => c.changeType === "add_foreign_key")) {
    checks.push({
      check: "FK orphan check",
      command: `SELECT count(*) FROM table t LEFT JOIN ref_table r ON t.column = r.ref_column WHERE r.ref_column IS NULL;`,
      description: "Check for orphaned rows that would violate FK constraint",
    });
  }

  if (changes.some((c) => c.changeType.includes("unique"))) {
    checks.push({
      check: "Uniqueness validation",
      command: `SELECT column, count(*) FROM table GROUP BY column HAVING count(*) > 1;`,
      description: "Verify no duplicate values before adding unique constraint",
    });
  }

  return checks;
}

// ─── Cross-Table Column Check ──────────────────────────────────

interface CrossTableWarning {
  columnName: string;
  changedInTable: string;
  sameColumnInTables: string[];
  affectedServicesPerTable: Record<string, string[]>;
  warning: string;
}

export async function checkCrossTableColumns(
  projectId: string,
  changes: ParsedChange[],
): Promise<CrossTableWarning[]> {
  const warnings: CrossTableWarning[] = [];

  for (const change of changes) {
    if (!change.columnName) continue;

    let checkColumn = change.columnName;
    if (checkColumn.includes(" → ")) checkColumn = checkColumn.split(" → ")[0].trim();
    if (!checkColumn || checkColumn === "unknown") continue;

    const otherTables = await db.all(
      `SELECT DISTINCT table_name FROM dependency_graph WHERE project_id = ? AND column_name = ? AND table_name != ? LIMIT 10`,
      projectId, checkColumn, change.tableName,
    ) as Array<{ table_name: string }>;

    if (otherTables.length > 0) {
      const tableNames = [...new Set(otherTables.map((t) => t.table_name))];
      const affectedServicesPerTable: Record<string, string[]> = {};

      for (const tbl of tableNames) {
        const services = await db.all(
          `SELECT DISTINCT r.service_name FROM dependency_graph dg JOIN registered_repos r ON dg.repo_id = r.id WHERE dg.project_id = ? AND dg.table_name = ?`,
          projectId, tbl,
        ) as Array<{ service_name: string }>;
        affectedServicesPerTable[tbl] = services.map((s) => s.service_name);
      }

      warnings.push({
        columnName: checkColumn,
        changedInTable: change.tableName,
        sameColumnInTables: tableNames,
        affectedServicesPerTable,
        warning: `⚠️ Column "${checkColumn}" also exists in tables: ${tableNames.join(", ")}. You are only changing it in "${change.tableName}". Make sure these other tables have been considered.`,
      });
    }
  }

  return warnings;
}
