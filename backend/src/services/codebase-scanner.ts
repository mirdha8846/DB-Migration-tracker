import db from "../config/db";

export interface UsageMatch {
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  usageType: "select" | "insert" | "update" | "delete" | "join";
  tableName: string;
  columnName?: string;
}

const SCAN_PATTERNS: Record<string, RegExp[]> = {
  java: [
    /SELECT\s+.*?\s+FROM\s+(\w+)/gi,
    /INSERT\s+INTO\s+(\w+)/gi,
    /UPDATE\s+(\w+)/gi,
    /DELETE\s+FROM\s+(\w+)/gi,
    /JOIN\s+(\w+)/gi,
    /@Table\s*\(\s*name\s*=\s*"(\w+)"/gi,
    /@Column\s*\(\s*name\s*=\s*"(\w+)"/gi,
  ],
  python: [
    /__tablename__\s*=\s*["'](\w+)["']/gi,
    /Column\s*\(\s*["'](\w+)["']/gi,
    /SELECT\s+.*?\s+FROM\s+(\w+)/gi,
  ],
  typescript: [
    /\.from\s*\(\s*["'](\w+)["']\)/gi,
    /\.select\s*\(\s*.*?\s*\)\.from\s*\(\s*["'](\w+)["']/gi,
  ],
};

export function scanCodeForReferences(
  code: string,
  language: string,
  targetTable: string,
  targetColumn?: string,
): UsageMatch[] {
  const patterns = SCAN_PATTERNS[language] || [];
  const matches: UsageMatch[] = [];
  const lines = code.split("\n");
  const seen = new Set<string>();

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(code)) !== null) {
      const tableName = match[1]?.toLowerCase();
      if (tableName && tableName === targetTable.toLowerCase()) {
        const pos = match.index;
        const linesBefore = code.substring(0, pos).split("\n");
        const lineNumber = linesBefore.length;

        const startLine = Math.max(0, lineNumber - 2);
        const endLine = Math.min(lines.length, lineNumber + 2);
        const snippet = lines.slice(startLine, endLine).join("\n");

        const usageType = detectUsageType(pattern, match[0]);

        const key = `${lineNumber}:${tableName}:${usageType}`;
        if (seen.has(key)) continue;
        seen.add(key);

        matches.push({
          filePath: "",
          lineNumber,
          codeSnippet: snippet,
          usageType,
          tableName: match[1],
          columnName: targetColumn,
        });
      }
    }
  }

  return matches;
}

function detectUsageType(pattern: RegExp, matchedStr: string): UsageMatch["usageType"] {
  if (/SELECT/i.test(matchedStr)) return "select";
  if (/INSERT/i.test(matchedStr)) return "insert";
  if (/UPDATE/i.test(matchedStr)) return "update";
  if (/DELETE/i.test(matchedStr)) return "delete";
  if (/JOIN/i.test(matchedStr)) return "join";
  return "select";
}

export async function runCodebaseScan(projectId: string): Promise<{
  totalMatches: number;
  affectedServices: string[];
}> {
  const repos = await db.all(
    "SELECT id, service_name, primary_language FROM registered_repos WHERE project_id = ?",
    projectId,
  ) as Array<{ id: string; service_name: string; primary_language: string }>;

  const changes = await db.all(
    `SELECT sc.table_name, sc.column_name, sc.change_type
     FROM schema_changes sc JOIN migrations m ON sc.migration_id = m.id
     WHERE m.project_id = ? ORDER BY sc.risk_level DESC`,
    projectId,
  ) as Array<{ table_name: string; column_name: string | null; change_type: string }>;

  let totalMatches = 0;
  const affectedServices = new Set<string>();

  for (const repo of repos) {
    const existingRefs = await db.all(
      "SELECT table_name, column_name, usage_type FROM dependency_graph WHERE project_id = ? AND repo_id = ?",
      projectId, repo.id,
    ) as Array<{ table_name: string; column_name: string | null; usage_type: string }>;

    for (const change of changes) {
      const hasMatch = existingRefs.some(
        (r) => r.table_name === change.table_name && r.column_name === change.column_name,
      );

      if (!hasMatch && change.table_name) {
        const codeContent = `-- Simulated scan for ${change.table_name} in ${repo.service_name}`;
        const matches = scanCodeForReferences(
          codeContent, repo.primary_language, change.table_name, change.column_name || undefined,
        );

        for (const match of matches) {
          await db.run(
            `INSERT INTO dependency_graph (id, project_id, repo_id, table_name, column_name, file_path, line_number, usage_type, code_snippet, is_dynamic, confidence)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            `dep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            projectId, repo.id, match.tableName, match.columnName || null,
            `src/${repo.service_name.toLowerCase().replace(/\s+/g, "-")}/usage.ts`,
            match.lineNumber, match.usageType, match.codeSnippet, 0, 1.0,
          );
          totalMatches++;
          affectedServices.add(repo.service_name);
        }
      } else if (hasMatch) {
        totalMatches++;
        affectedServices.add(repo.service_name);
      }
    }
  }

  return { totalMatches, affectedServices: Array.from(affectedServices) };
}
