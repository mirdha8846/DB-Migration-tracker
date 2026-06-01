import fs from "fs";
import path from "path";

export interface CodeMatch {
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  usageType: "select" | "insert" | "update" | "delete" | "join" | "orm_model" | "annotation" | "raw_sql" | "migration";
  tableName: string;
  columnName?: string;
  framework: string;
  confidence: number;
}

type ScannerPattern = {
  name: string;
  patterns: RegExp[];
  usageType: CodeMatch["usageType"];
  framework: string;
  extractTable: (match: RegExpExecArray) => string;
  extractColumn?: (match: RegExpExecArray) => string | undefined;
};

const JAVA_PATTERNS: ScannerPattern[] = [
  {
    name: "JPA Entity",
    patterns: [/@Entity\s*\n?\s*(?:@Table\s*\(\s*name\s*=\s*"(\w+)")?/g, /@Table\s*\(\s*name\s*=\s*"(\w+)"/g],
    usageType: "orm_model",
    framework: "JPA",
    extractTable: (m) => m[1],
  },
  {
    name: "JPA Column",
    patterns: [/@Column\s*\(\s*name\s*=\s*"(\w+)"/g],
    usageType: "annotation",
    framework: "JPA",
    extractTable: () => "",
    extractColumn: (m) => m[1],
  },
  {
    name: "JPQL/NamedQuery",
    patterns: [/@NamedQuery\s*\([^)]*query\s*=\s*"[^"]*FROM\s+(\w+)/gi, /@Query\s*\(\s*"[^"]*FROM\s+(\w+)/gi],
    usageType: "select",
    framework: "Spring Data JPA",
    extractTable: (m) => m[1],
  },
  {
    name: "SQL String",
    patterns: [/"(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi, /'(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi],
    usageType: "raw_sql",
    framework: "JDBC",
    extractTable: (m) => m[1] || "",
  },
  {
    name: "MyBatis mapper",
    patterns: [/<select[^>]*>[\s\S]*?FROM\s+(\w+)/gi, /<insert[^>]*>[\s\S]*?INTO\s+(\w+)/gi, /<update[^>]*>[\s\S]*?UPDATE\s+(\w+)/gi, /<delete[^>]*>[\s\S]*?FROM\s+(\w+)/gi],
    usageType: "select",
    framework: "MyBatis",
    extractTable: (m) => m[1] || "",
  },
  {
    name: "Repository method",
    patterns: [/findBy(\w+)(?:And(\w+))*/g],
    usageType: "select",
    framework: "Spring Data",
    extractTable: () => "",
  },
];

const PYTHON_PATTERNS: ScannerPattern[] = [
  {
    name: "SQLAlchemy Model",
    patterns: [/__tablename__\s*=\s*["'](\w+)["']/g],
    usageType: "orm_model",
    framework: "SQLAlchemy",
    extractTable: (m) => m[1],
  },
  {
    name: "SQLAlchemy Column",
    patterns: [/Column\s*\(\s*["'](\w+)["']/g],
    usageType: "annotation",
    framework: "SQLAlchemy",
    extractTable: () => "",
    extractColumn: (m) => m[1],
  },
  {
    name: "Django Model",
    patterns: [/class\s+(\w+)\s*\(\s*models\.Model\s*\)/g],
    usageType: "orm_model",
    framework: "Django",
    extractTable: (m) => m[1].toLowerCase(),
  },
  {
    name: "Raw SQL",
    patterns: [/(?:cursor\.execute|\.execute)\s*\(\s*["'](?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi, /text\s*\(\s*["'](?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi],
    usageType: "raw_sql",
    framework: "Raw SQL",
    extractTable: (m) => m[1] || "",
  },
];

const TYPESCRIPT_PATTERNS: ScannerPattern[] = [
  {
    name: "TypeORM Entity",
    patterns: [/@Entity\s*\(\s*{?\s*name\s*:\s*["'](\w+)["']/g, /@Entity\s*\(\s*["'](\w+)["']\)/g],
    usageType: "orm_model",
    framework: "TypeORM",
    extractTable: (m) => m[1],
  },
  {
    name: "Prisma Model",
    patterns: [/model\s+(\w+)\s*{/g],
    usageType: "orm_model",
    framework: "Prisma",
    extractTable: (m) => m[1].toLowerCase(),
  },
  {
    name: "Knex/QueryBuilder",
    patterns: [/(?:knex|db)\s*\(\s*["'](\w+)["']\)/g, /\.from\s*\(\s*["'](\w+)["']\)/g, /\.into\s*\(\s*["'](\w+)["']\)/g],
    usageType: "select",
    framework: "Knex.js",
    extractTable: (m) => m[1],
  },
  {
    name: "Prisma Client",
    patterns: [/prisma\.(\w+)\.(?:findMany|findUnique|findFirst|create|update|delete|upsert)/g],
    usageType: "select",
    framework: "Prisma Client",
    extractTable: (m) => m[1],
  },
  {
    name: "SQL Template",
    patterns: [/`\s*(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi, /sql\s*`\s*(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi],
    usageType: "raw_sql",
    framework: "SQL Tag",
    extractTable: (m) => m[1] || "",
  },
];

const GO_PATTERNS: ScannerPattern[] = [
  {
    name: "GORM Model",
    patterns: [/gorm\.Model\s*\n\s*\w+\s+(\w+)/g],
    usageType: "orm_model",
    framework: "GORM",
    extractTable: () => "",
  },
  {
    name: "Raw SQL",
    patterns: [/db\.(?:Exec|Query|Raw)\s*\(\s*["'](?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/gi],
    usageType: "raw_sql",
    framework: "database/sql",
    extractTable: (m) => m[1] || "",
  },
];

const LANG_PATTERNS: Record<string, ScannerPattern[]> = {
  java: JAVA_PATTERNS,
  python: PYTHON_PATTERNS,
  typescript: TYPESCRIPT_PATTERNS,
  go: GO_PATTERNS,
  js: TYPESCRIPT_PATTERNS,
  ts: TYPESCRIPT_PATTERNS,
};

export function scanCodeForTableRefs(
  code: string,
  language: string,
  filePath: string,
  targetTable?: string,
  targetColumn?: string,
): CodeMatch[] {
  const patterns = LANG_PATTERNS[language] || [];
  const results: CodeMatch[] = [];
  const lines = code.split("\n");
  const seen = new Set<string>();

  for (const patternGroup of patterns) {
    for (const regex of patternGroup.patterns) {
      let match: RegExpExecArray | null;
      const re = new RegExp(regex.source, regex.flags);

      while ((match = re.exec(code)) !== null) {
        let tableName = patternGroup.extractTable(match);
        const columnName = patternGroup.extractColumn?.(match);

        if (!tableName && match[1]) {
          tableName = match[1];
        }

        if (!tableName && columnName) {
          tableName = "unknown_table";
        }

        // Skip if target is specified and doesn't match
        if (targetTable && tableName.toLowerCase() !== targetTable.toLowerCase()) continue;
        if (targetColumn && columnName && columnName.toLowerCase() !== targetColumn.toLowerCase()) continue;

        // Skip columns without table context
        if (!tableName && !targetTable) continue;

        const pos = match.index;
        const linesBefore = code.substring(0, pos).split("\n");
        const lineNumber = linesBefore.length;

        const startLine = Math.max(0, lineNumber - 2);
        const endLine = Math.min(lines.length, lineNumber + 2);
        const snippet = lines.slice(startLine, endLine).join("\n").substring(0, 200);

        const key = `${filePath}:${lineNumber}:${tableName}:${patternGroup.name}`;
        if (seen.has(key)) continue;
        seen.add(key);

        results.push({
          filePath,
          lineNumber,
          codeSnippet: snippet,
          usageType: patternGroup.usageType,
          tableName: tableName || "unknown",
          columnName: columnName,
          framework: patternGroup.framework,
          confidence: 0.85,
        });
      }
    }
  }

  return results;
}

function readCodeFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

export async function scanRepository(
  repoPath: string,
  language: string,
  targetTable?: string,
  targetColumn?: string,
): Promise<CodeMatch[]> {
  const extMap: Record<string, string[]> = {
    java: [".java", ".xml"],
    python: [".py"],
    typescript: [".ts", ".tsx", ".js", ".jsx"],
    js: [".js", ".jsx", ".ts", ".tsx"],
    go: [".go"],
  };

  const extensions = extMap[language] || [".ts", ".js"];
  const files = listCodeFiles(repoPath, extensions);
  const allMatches: CodeMatch[] = [];

  for (const file of files) {
    const code = readCodeFile(file);
    const relativePath = path.relative(repoPath, file);
    const matches = scanCodeForTableRefs(code, language, relativePath, targetTable, targetColumn);
    allMatches.push(...matches);
  }

  return allMatches;
}

function listCodeFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const skipPaths = new Set(["node_modules", ".git", "__pycache__", "dist", "build", ".next", "target", "vendor"]);

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || skipPaths.has(entry.name)) continue;
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          if (extensions.includes(path.extname(entry.name))) {
            results.push(full);
          }
        }
      }
    } catch {
      /* skip unreadable dirs */
    }
  }

  walk(dir);
  return results;
}
