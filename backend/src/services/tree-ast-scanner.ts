import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import Python from "tree-sitter-python";
import TypeScript from "tree-sitter-typescript";
import Go from "tree-sitter-go";
import fs from "fs";
import path from "path";

export interface AstMatch {
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  usageType: "select" | "insert" | "update" | "delete" | "join" | "orm_model" | "annotation" | "raw_sql" | "migration";
  tableName: string;
  columnName?: string;
  framework: string;
  confidence: number;
}

interface LanguageConfig {
  grammar: any;
  fileExtensions: string[];
  nodeTypes: string[];
  extractReferences: (node: Parser.SyntaxNode, source: string, filePath: string) => AstMatch[];
}

function getLanguageConfig(lang: string): LanguageConfig | null {
  switch (lang) {
    case "java":
      return {
        grammar: Java,
        fileExtensions: [".java"],
        nodeTypes: ["string_literal", "annotation", "method_invocation", "class_declaration"],
        extractReferences: extractJavaReferences,
      };
    case "python":
      return {
        grammar: Python,
        fileExtensions: [".py"],
        nodeTypes: ["string", "assignment", "class_definition", "call"],
        extractReferences: extractPythonReferences,
      };
    case "typescript":
    case "ts":
    case "js":
      return {
        grammar: TypeScript.typescript,
        fileExtensions: [".ts", ".tsx"],
        nodeTypes: ["string", "template_string", "call_expression", "class_declaration"],
        extractReferences: extractTypeScriptReferences,
      };
    case "go":
      return {
        grammar: Go,
        fileExtensions: [".go"],
        nodeTypes: ["interpreted_string_literal", "call_expression", "type_declaration"],
        extractReferences: extractGoReferences,
      };
    default:
      return null;
  }
}

function getLineNumber(source: string, byteOffset: number): number {
  return source.substring(0, byteOffset).split("\n").length;
}

function getSnippet(source: string, byteOffset: number, lines: string[]): string {
  const lineNum = getLineNumber(source, byteOffset) - 1;
  const start = Math.max(0, lineNum - 2);
  const end = Math.min(lines.length, lineNum + 3);
  return lines.slice(start, end).join("\n").substring(0, 300);
}

// ─── Java AST Extraction ─────────────────────────────────────
function extractJavaReferences(node: Parser.SyntaxNode, source: string, filePath: string): AstMatch[] {
  const matches: AstMatch[] = [];
  const lines = source.split("\n");
  const seen = new Set<string>();

  // Walk all descendant nodes
  const cursor = node.walk();
  const visited = new Set<number>();

  function visit(n: Parser.SyntaxNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);

    // JPA @Table annotation
    if (n.type === "annotation" && source.substring(n.startIndex, n.endIndex).includes("@Table")) {
      const nameMatch = source.substring(n.startIndex, n.endIndex).match(/name\s*=\s*"(\w+)"/);
      if (nameMatch) {
        const tableName = nameMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:@Table:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "orm_model", tableName, framework: "JPA", confidence: 0.95 });
        }
      }
    }

    // JPA @Column annotation
    if (n.type === "annotation" && source.substring(n.startIndex, n.endIndex).includes("@Column")) {
      const nameMatch = source.substring(n.startIndex, n.endIndex).match(/name\s*=\s*"(\w+)"/);
      if (nameMatch) {
        const colName = nameMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:@Column:${colName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "annotation", tableName: "unknown_table", columnName: colName, framework: "JPA", confidence: 0.95 });
        }
      }
    }

    // String literals with SQL
    if (n.type === "string_literal") {
      const text = source.substring(n.startIndex + 1, n.endIndex - 1);
      const sqlMatch = text.match(/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/i);
      if (sqlMatch) {
        const tableName = sqlMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const usageType: AstMatch["usageType"] = /SELECT/i.test(text) ? "select" : /INSERT/i.test(text) ? "insert" : /UPDATE/i.test(text) ? "update" : /DELETE/i.test(text) ? "delete" : "raw_sql";
        const key = `${filePath}:${lineNum}:sql:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType, tableName, framework: "JDBC", confidence: 0.85 });
        }
      }
      // Also detect table names in FROM clauses
      const fromMatch = text.match(/FROM\s+(\w+)/i);
      if (fromMatch && !sqlMatch) {
        const tableName = fromMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:from:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "select", tableName, framework: "JDBC", confidence: 0.7 });
        }
      }
    }

    // JPA repository method names (findByXxx)
    if (n.type === "method_declaration") {
      const methodText = source.substring(n.startIndex, n.endIndex);
      const methodNameMatch = methodText.match(/\s(\w+)\s*\(/);
      if (methodNameMatch) {
        const methodName = methodNameMatch[1];
        if (/^(find|get|query|count|delete|update)\w*(By|All)/.test(methodName)) {
          const lineNum = getLineNumber(source, n.startIndex);
          const key = `${filePath}:${lineNum}:jpa-method:${methodName}`;
          if (!seen.has(key)) {
            seen.add(key);
            matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "select", tableName: methodName, framework: "Spring Data JPA", confidence: 0.5 });
          }
        }
      }
    }

    for (const child of n.children) visit(child);
  }

  visit(node);
  return matches;
}

// ─── Python AST Extraction ───────────────────────────────────
function extractPythonReferences(node: Parser.SyntaxNode, source: string, filePath: string): AstMatch[] {
  const matches: AstMatch[] = [];
  const lines = source.split("\n");
  const seen = new Set<string>();
  const cursor = node.walk();
  const visited = new Set<number>();

  function visit(n: Parser.SyntaxNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);

    // SQLAlchemy __tablename__
    if (n.type === "assignment" || n.type === "expression_statement") {
      const text = source.substring(n.startIndex, n.endIndex);
      const tableMatch = text.match(/__tablename__\s*=\s*["'](\w+)["']/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:tablename:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "orm_model", tableName, framework: "SQLAlchemy", confidence: 0.95 });
        }
      }
    }

    // SQLAlchemy Column()
    if (n.type === "call") {
      const text = source.substring(n.startIndex, n.endIndex);
      const colMatch = text.match(/Column\s*\(\s*["'](\w+)["']/);
      if (colMatch) {
        const colName = colMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:column:${colName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "annotation", tableName: "unknown_table", columnName: colName, framework: "SQLAlchemy", confidence: 0.95 });
        }
      }
    }

    // String literals with SQL
    if (n.type === "string") {
      const text = source.substring(n.startIndex + 1, n.endIndex - 1);
      const sqlMatch = text.match(/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/i);
      if (sqlMatch) {
        const tableName = sqlMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const usageType: AstMatch["usageType"] = /SELECT/i.test(text) ? "select" : "raw_sql";
        const key = `${filePath}:${lineNum}:sql:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType, tableName, framework: "Raw SQL", confidence: 0.85 });
        }
      }
    }

    for (const child of n.children) visit(child);
  }

  visit(node);
  return matches;
}

// ─── TypeScript AST Extraction ──────────────────────────────
function extractTypeScriptReferences(node: Parser.SyntaxNode, source: string, filePath: string): AstMatch[] {
  const matches: AstMatch[] = [];
  const lines = source.split("\n");
  const seen = new Set<string>();
  const cursor = node.walk();
  const visited = new Set<number>();

  function visit(n: Parser.SyntaxNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);

    // String literals with SQL / table references
    if (n.type === "string" || n.type === "template_string") {
      const raw = source.substring(n.startIndex, n.endIndex);
      const text = raw.replace(/`|\$\{[^}]*\}/g, "");
      const tableRef = text.match(/(?:SELECT|INSERT|UPDATE|DELETE|FROM|INTO|JOIN)\s+(\w+)/i);
      if (tableRef) {
        const tableName = tableRef[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:ts-sql:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "raw_sql", tableName, framework: "Raw SQL", confidence: 0.8 });
        }
      }
    }

    // Prisma model (model User { ... })
    if (n.type === "class_declaration" || n.type === "statement_block") {
      const text = source.substring(n.startIndex, n.endIndex);
      const modelMatch = text.match(/model\s+(\w+)\s*\{/);
      if (modelMatch) {
        const tableName = modelMatch[1].toLowerCase();
        const lineNum = getLineNumber(source, n.startIndex);
        const key = `${filePath}:${lineNum}:prisma:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType: "orm_model", tableName, framework: "Prisma", confidence: 0.9 });
        }
      }
    }

    for (const child of n.children) visit(child);
  }

  visit(node);
  return matches;
}

// ─── Go AST Extraction ──────────────────────────────────────
function extractGoReferences(node: Parser.SyntaxNode, source: string, filePath: string): AstMatch[] {
  const matches: AstMatch[] = [];
  const lines = source.split("\n");
  const seen = new Set<string>();
  const cursor = node.walk();
  const visited = new Set<number>();

  function visit(n: Parser.SyntaxNode) {
    if (visited.has(n.id)) return;
    visited.add(n.id);

    // String literals with SQL
    if (n.type === "interpreted_string_literal") {
      const text = source.substring(n.startIndex + 1, n.endIndex - 1);
      const sqlMatch = text.match(/(?:SELECT|INSERT|UPDATE|DELETE)\s+.*?\s+(?:FROM|INTO|JOIN)?\s*(\w+)/i);
      if (sqlMatch) {
        const tableName = sqlMatch[1];
        const lineNum = getLineNumber(source, n.startIndex);
        const usageType: AstMatch["usageType"] = /SELECT/i.test(text) ? "select" : "raw_sql";
        const key = `${filePath}:${lineNum}:go-sql:${tableName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({ filePath, lineNumber: lineNum, codeSnippet: getSnippet(source, n.startIndex, lines), usageType, tableName, framework: "database/sql", confidence: 0.85 });
        }
      }
    }

    for (const child of n.children) visit(child);
  }

  visit(node);
  return matches;
}

// ─── Main Scanner ──────────────────────────────────────────────
export function scanFileWithTreeSitter(
  filePath: string,
  language: string,
  targetTable?: string,
  targetColumn?: string,
): AstMatch[] {
  const config = getLanguageConfig(language);
  if (!config) return [];

  try {
    const source = fs.readFileSync(filePath, "utf-8");
    const parser = new Parser();
    parser.setLanguage(config.grammar);
    const tree = parser.parse(source);
    const matches = config.extractReferences(tree.rootNode, source, filePath);

    // Filter by target if specified
    if (targetTable) {
      return matches.filter((m) => m.tableName.toLowerCase() === targetTable.toLowerCase());
    }
    return matches;
  } catch (err: any) {
    console.error(`Tree-sitter error for ${filePath}:`, err.message);
    return [];
  }
}

export async function scanRepositoryTreeSitter(
  repoPath: string,
  language: string,
  targetTable?: string,
  targetColumn?: string,
): Promise<AstMatch[]> {
  const config = getLanguageConfig(language);
  if (!config) return [];

  const files = listFiles(repoPath, config.fileExtensions);
  const allMatches: AstMatch[] = [];

  for (const file of files) {
    const relativePath = path.relative(repoPath, file);
    const matches = scanFileWithTreeSitter(file, language, targetTable, targetColumn);
    const renamed = matches.map((m) => ({ ...m, filePath: relativePath }));
    allMatches.push(...renamed);
  }

  console.log(`🌳 Tree-sitter: ${allMatches.length} refs found in ${files.length} files (${language})`);
  return allMatches;
}

function listFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];
  const skip = new Set(["node_modules", ".git", "__pycache__", "dist", "build", ".next", "target", "vendor", "venv", ".venv"]);

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".") || skip.has(entry.name)) continue;
        const full = path.join(currentDir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && extensions.includes(path.extname(entry.name))) {
          results.push(full);
        }
      }
    } catch { /* skip */ }
  }

  walk(dir);
  return results;
}
