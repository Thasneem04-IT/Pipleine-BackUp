// export type AgentId =
//   | "planner"
//   | "log"
//   | "rag"
//   | "schema"
//   | "risk"
//   | "recovery"
//   | "reviewer"
//   | "evaluation";

export type AgentId =
  | "planner"
  | "log"
  | "rag_agent"
  | "schema_agent"
  | "risk_agent"
  | "recovery_agent"
  | "reviewer_agent"
  | "evaluation_agent";

export type AgentStatus = "waiting" | "running" | "completed" | "failed";

export interface AgentState {
  id: AgentId;
  name: string;
  status: AgentStatus;
  durationMs: number | null;
  summary: string | null;
}

export interface IncidentInput {
  pipelineName: string;
  source: string;
  destination: string;
  executionId: string;
  failureDescription: string;
  logs: string;
  schemaInfo: string;
  documents: KnowledgeDoc[];
}

export interface KnowledgeDoc {
  name: string;
  content: string;
}

export interface EvidenceItem {
  source: string;
  quote: string;
}

export interface RetrievedChunk {
  document: string;
  chunk: string;
  score: number;
}

export interface SchemaAnalysis {
  driftDetected: boolean;
  missingColumns: string[];
  typeChanges: string[];
  notes: string;
}

export interface BusinessImpact {
  severity: "low" | "medium" | "high" | "critical" | string;
  affectedSystems: string[];
  slaRisk: string;
  summary: string;
}

export interface RecoveryPlan {
  steps: string[];
  rationale: string;
  requiresApproval: boolean;
}

export interface ReviewResult {
  supported: boolean;
  issues: string[];
  notes: string;
}

export interface EvaluationResult {
  confidence: number;
  groundedness: number;
  hallucinationRisk: number;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  model: string;
}

export interface Investigation {
  id: string;
  createdAt: string;
  input: IncidentInput;
  plan: string[];
  agents: AgentState[];
  summary: string;
  rootCause: string;
  evidence: EvidenceItem[];
  retrievedChunks: RetrievedChunk[];
  schemaAnalysis: SchemaAnalysis;
  businessImpact: BusinessImpact;
  recovery: RecoveryPlan;
  review: ReviewResult;
  evaluation: EvaluationResult;
}

export type StreamEvent =
  | { type: "agent"; id: AgentId; status: AgentStatus; durationMs?: number; summary?: string }
  | { type: "result"; investigation: Investigation }
  | { type: "error"; message: string };

// export const AGENT_ORDER: { id: AgentId; name: string; role: string }[] = [
//   { id: "planner", name: "Planner", role: "Builds the investigation plan" },
//   { id: "log", name: "Log Agent", role: "Parses pipeline logs for errors" },
//   { id: "rag", name: "RAG Agent", role: "Retrieves enterprise knowledge" },
//   { id: "schema", name: "Schema Agent", role: "Detects schema drift" },
//   { id: "risk", name: "Risk Agent", role: "Severity, impact, SLA risk" },
//   { id: "recovery", name: "Recovery Agent", role: "Recommends recovery steps" },
//   { id: "reviewer", name: "Reviewer", role: "Verifies evidence support" },
//   { id: "evaluation", name: "Evaluation", role: "Confidence & cost metrics" },
// ];

export const AGENT_ORDER: { id: AgentId; name: string; role: string }[] = [
  { id: "planner", name: "Planner", role: "Builds the investigation plan" },
  { id: "log", name: "Log Agent", role: "Parses pipeline logs for errors" },
  { id: "rag_agent", name: "RAG Agent", role: "Retrieves enterprise knowledge" },
  { id: "schema_agent", name: "Schema Agent", role: "Detects schema drift" },
  { id: "risk_agent", name: "Risk Agent", role: "Severity, impact, SLA risk" },
  { id: "recovery_agent", name: "Recovery Agent", role: "Recommends recovery steps" },
  { id: "reviewer_agent", name: "Reviewer", role: "Verifies evidence support" },
  { id: "evaluation_agent", name: "Evaluation", role: "Confidence & cost metrics" },
];

export function emptyAgents(): AgentState[] {
  return AGENT_ORDER.map((a) => ({
    id: a.id,
    name: a.name,
    status: "waiting" as AgentStatus,
    durationMs: null,
    summary: null,
  }));
}
