import db from "../config/db";

export interface DetectedChange {
  changeType: string;
  tableName: string;
  columnName?: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  lockingThreat?: "LOW" | "MODERATE" | "SEVERE" | "HIGH";
  crossTableWarning?: string;
  sameColumnInOtherTables?: string[];
}

const DETECTION_RULES: Array<{
  regex: RegExp;
  changeType: string;
  risk: DetectedChange["riskLevel"];
  lockingThreat?: DetectedChange["lockingThreat"];
}> = [
  { regex: /DROP\s+TABLE\s+IF\s+EXISTS\s+(\w+)/i, changeType: "drop_table", risk: "critical", lockingThreat: "SEVERE" },
  { regex: /DROP\s+TABLE\s+(?!IF)(\w+)/i, changeType: "drop_table", risk: "critical", lockingThreat: "SEVERE" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+IF\s+EXISTS\s+(\w+)/i, changeType: "drop_column", risk: "critical" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+COLUMN\s+(\w+)/i, changeType: "drop_column", risk: "critical" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+RENAME\s+COLUMN\s+(\w+)\s+TO\s+(\w+)/i, changeType: "rename_column", risk: "high" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ALTER\s+COLUMN\s+(\w+)\s+TYPE\s+(\w+)/i, changeType: "alter_column_type", risk: "high" },
  { regex: /RENAME\s+COLUMN\s+(\w+)\.(\w+)\s+TO\s+(\w+)/i, changeType: "rename_column", risk: "high" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+(\w+)\s+NOT\s+NULL/i, changeType: "add_column_not_null", risk: "high", lockingThreat: "HIGH" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+DROP\s+INDEX\s+(\w+)/i, changeType: "drop_index", risk: "medium" },
  { regex: /DROP\s+INDEX\s+(\w+)/i, changeType: "drop_index", risk: "medium" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT\s+(\w+)\s+FOREIGN\s+KEY/i, changeType: "add_foreign_key", risk: "medium" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+CONSTRAINT/i, changeType: "add_constraint", risk: "low" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)\s+(\w+)/i, changeType: "add_column", risk: "low" },
  { regex: /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+(\w+)/i, changeType: "add_column", risk: "low" },
  { regex: /CREATE\s+TABLE\s+(\w+)/i, changeType: "create_table", risk: "low" },
  { regex: /CREATE\s+INDEX\s+CONCURRENTLY\s+(\w+)\s+ON\s+(\w+)/i, changeType: "add_index", risk: "low" },
  { regex: /CREATE\s+INDEX\s+(?!CONCURRENTLY)(\w+)\s+ON\s+(\w+)/i, changeType: "add_index", risk: "medium", lockingThreat: "SEVERE" },
  { regex: /CREATE\s+UNIQUE\s+INDEX\s+(\w+)\s+ON\s+(\w+)/i, changeType: "add_unique_index", risk: "high", lockingThreat: "SEVERE" },
  { regex: /COMMENT\s+ON\s+COLUMN\s+(\w+)\.(\w+)/i, changeType: "comment_on_column", risk: "low" },
];

export function parseSqlMigration(sql: string): DetectedChange[] {
  const lines = sql.split("\n");
  const changes: DetectedChange[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("--")) continue;

    for (const rule of DETECTION_RULES) {
      const match = trimmed.match(rule.regex);
      if (!match) continue;

      let tableName = "";
      let columnName: string | undefined;

      if (rule.changeType === "drop_table" || rule.changeType === "create_table") {
        tableName = match[1];
      } else if (rule.changeType === "rename_column") {
        tableName = match[1];
        columnName = `${match[2]} → ${match[3]}`;
      } else if (rule.changeType === "drop_index") {
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
        riskLevel: rule.risk,
        lockingThreat: rule.lockingThreat,
      });
    }
  }

  return changes;
}

export function calculateOverallRisk(changes: DetectedChange[]): DetectedChange["riskLevel"] {
  if (changes.some((c) => c.riskLevel === "critical")) return "critical";
  if (changes.some((c) => c.riskLevel === "high")) return "high";
  if (changes.some((c) => c.riskLevel === "medium")) return "medium";
  return "low";
}

export function getLockingThreat(changes: DetectedChange[]): DetectedChange["lockingThreat"] {
  if (changes.some((c) => c.lockingThreat === "SEVERE")) return "SEVERE";
  if (changes.some((c) => c.lockingThreat === "HIGH")) return "HIGH";
  if (changes.some((c) => c.lockingThreat === "MODERATE")) return "MODERATE";
  return "LOW";
}

// ─── Cross-table column consistency check ───────────────────
export interface CrossTableWarning {
  columnName: string;
  changedInTable: string;
  sameColumnInTables: string[];
  affectedServicesPerTable: Record<string, string[]>;
  warning: string;
}

export async function checkCrossTableColumns(
  projectId: string,
  changes: DetectedChange[],
): Promise<CrossTableWarning[]> {
  const warnings: CrossTableWarning[] = [];

  for (const change of changes) {
    if (!change.columnName) continue;

    // For rename: columnName is "old_name → new_name", extract the old name
    let checkColumnName = change.columnName;
    if (checkColumnName.includes(" → ")) {
      checkColumnName = checkColumnName.split(" → ")[0].trim();
    }

    if (!checkColumnName || checkColumnName === "unknown") continue;

    // Find other tables in dependency_graph that have the same column name
    const otherTables = await db.all(
      `SELECT DISTINCT table_name, column_name FROM dependency_graph
       WHERE project_id = ? AND column_name = ? AND table_name != ?
       LIMIT 10`,
      projectId, checkColumnName, change.tableName,
    ) as Array<{ table_name: string; column_name: string }>;

    if (otherTables.length > 0) {
      const tableNames = [...new Set(otherTables.map((t) => t.table_name))];
      const affectedServicesPerTable: Record<string, string[]> = {};

      for (const tbl of tableNames) {
        const services = await db.all(
          `SELECT DISTINCT r.service_name FROM dependency_graph dg
           JOIN registered_repos r ON dg.repo_id = r.id
           WHERE dg.project_id = ? AND dg.table_name = ?`,
          projectId, tbl,
        ) as Array<{ service_name: string }>;
        affectedServicesPerTable[tbl] = services.map((s) => s.service_name);
      }

      warnings.push({
        columnName: checkColumnName,
        changedInTable: change.tableName,
        sameColumnInTables: tableNames,
        affectedServicesPerTable,
        warning: `⚠️ Column "${checkColumnName}" also exists in tables: ${tableNames.join(", ")}. You are only changing it in "${change.tableName}". Make sure these other tables have been considered.`,
      });
    }
  }

  return warnings;
}
