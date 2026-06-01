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
  riskLevel?: RiskLevel;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: "solid" | "dashed";
}

export interface MigrationsByRiskPoint {
  label: string;
  low: number;
  medium: number;
  critical: number;
}

export interface OverviewStatsResponse {
  totalMigrations: number;
  affectedServices: number;
  activeProjects: number;
  criticalRisks: number;
  migrationsByRisk: MigrationsByRiskPoint[];
}

export interface RecentMigration {
  id: string;
  serviceName: string;
  riskLevel: RiskLevel;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  createdAt: string;
}

export interface AdvisorInsight {
  id: string;
  message: string;
  tags: string[];
}

export interface ProjectGraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface MigrationDetailResponse {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  filePath: string;
  fileContent: string;
  detectedChanges: Array<{
    type: string;
    object: string;
    target: string;
    impact: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  }>;
  riskLevel: RiskLevel;
  riskScore: number;
  lockingThreat: "LOW" | "MODERATE" | "SEVERE";
  aiInsights: string[];
  liveDbStats: {
    reqPerSec: number;
    vacuumActive: boolean;
  };
  deployOrder: string[];
}

export interface VaultSecret {
  id: string;
  name: string;
  type: string;
  scope: string;
  lastRotated: string;
  status: "ACTIVE" | "EXPIRING" | "REVOKED";
}

export interface VaultStatsResponse {
  storedSecrets: number;
  activeGrants: number;
  rotationsDue: number;
}
