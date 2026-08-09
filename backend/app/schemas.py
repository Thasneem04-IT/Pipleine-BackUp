"""Pydantic schemas shared by the API and the LangGraph workflow."""

from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentIn(BaseModel):
    name: str
    content: str


class IncidentRequest(BaseModel):
    pipeline_name: str
    source: str = ""
    destination: str = ""
    execution_id: str = ""
    failure_description: str
    logs: str = ""
    schema_info: str = ""
    documents: List[DocumentIn] = Field(default_factory=list)


class KnowledgeRequest(BaseModel):
    documents: List[DocumentIn]


class Evidence(BaseModel):
    source: str
    quote: str


class RetrievedChunk(BaseModel):
    document: str
    chunk: str
    score: float


class SchemaAnalysis(BaseModel):
    driftDetected: bool = False
    missingColumns: List[str] = Field(default_factory=list)
    typeChanges: List[str] = Field(default_factory=list)
    notes: str = ""


class BusinessImpact(BaseModel):
    severity: str = "medium"
    affectedSystems: List[str] = Field(default_factory=list)
    slaRisk: str = ""
    summary: str = ""


class RecoveryPlan(BaseModel):
    steps: List[str] = Field(default_factory=list)
    rationale: str = ""
    requiresApproval: bool = True


class ReviewResult(BaseModel):
    supported: bool = True
    issues: List[str] = Field(default_factory=list)
    notes: str = ""


class EvaluationResult(BaseModel):
    confidence: float = 0.0
    groundedness: float = 0.0
    hallucinationRisk: float = 0.0
    latencyMs: int = 0
    promptTokens: int = 0
    completionTokens: int = 0
    totalTokens: int = 0
    estimatedCostUsd: float = 0.0
    model: str = ""


class Investigation(BaseModel):
    id: str
    createdAt: str
    input: dict
    plan: List[str] = Field(default_factory=list)
    agents: list = Field(default_factory=list)
    summary: str = ""
    rootCause: str = ""
    evidence: List[Evidence] = Field(default_factory=list)
    retrievedChunks: List[RetrievedChunk] = Field(default_factory=list)
    schemaAnalysis: SchemaAnalysis = SchemaAnalysis()
    businessImpact: BusinessImpact = BusinessImpact()
    recovery: RecoveryPlan = RecoveryPlan()
    review: ReviewResult = ReviewResult()
    evaluation: EvaluationResult = EvaluationResult()
    error: Optional[str] = None
