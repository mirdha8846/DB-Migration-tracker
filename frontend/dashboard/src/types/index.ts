export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Migration {
  id: string;
  projectId: string;
  filename: string;
  riskLevel: RiskLevel;
  summary?: string;
  createdAt: string;
}

export interface SchemaChange {
  changeType: string;
  table: string;
  column?: string;
  risk: RiskLevel;
}

export interface AffectedService {
  name: string;
  filePaths: string[];
  suggestedFix?: string;
}

export interface ImpactReport {
  migrationId: string;
  changes: SchemaChange[];
  aiExplanation: string;
  affectedServices: AffectedService[];
  deployOrder: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  createdAt: string;
}

export interface DashboardStats {
  totalMigrations: number;
  criticalRisks: number;
  affectedServices: number;
  projects: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: "table" | "service";
}

export interface GraphEdge {
  source: string;
  target: string;
}
