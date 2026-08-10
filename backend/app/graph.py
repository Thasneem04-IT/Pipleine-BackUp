"""LangGraph multi-agent workflow for pipeline incident investigation.

START -> planner -> {log, rag, schema} -> risk -> recovery -> reviewer -> evaluation -> END
"""

import json
import operator
import time
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any, Dict, Iterator, List, TypedDict

from langgraph.graph import END, START, StateGraph

from .config import GROQ_MODEL, TOP_K
from .llm import TokenMeter, call_json
from .rag import retrieve


def merge_dict(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(a)
    out.update(b)
    return out


class GraphState(TypedDict, total=False):
    incident: Dict[str, Any]
    meter: Any
    plan: List[str]
    log_analysis: Dict[str, Any]
    rag: Dict[str, Any]
    schema: Dict[str, Any]
    risk: Dict[str, Any]
    recovery: Dict[str, Any]
    review: Dict[str, Any]
    evaluation: Dict[str, Any]
    durations: Annotated[Dict[str, float], merge_dict]
    summaries: Annotated[Dict[str, str], merge_dict]
    errors: Annotated[List[str], operator.add]


def _incident_brief(inc: Dict[str, Any]) -> str:
    return (
        f"Pipeline: {inc.get('pipeline_name')}\n"
        f"Source: {inc.get('source')}\n"
        f"Destination: {inc.get('destination')}\n"
        f"Execution ID: {inc.get('execution_id')}\n"
        f"Failure description: {inc.get('failure_description')}"
    )


def timed(name: str):
    """Wraps a node so it records duration and never crashes the graph."""

    def decorator(fn):
        def wrapper(state: GraphState) -> Dict[str, Any]:
            start = time.perf_counter()
            try:
                result = fn(state)
            except Exception as exc:  # surface as a failed agent, keep graph alive
                result = {"errors": [f"{name}: {exc}"], "summaries": {name: f"failed: {exc}"}}
            elapsed = (time.perf_counter() - start) * 1000
            result.setdefault("durations", {})
            result["durations"] = merge_dict(result.get("durations", {}), {name: elapsed})
            return result

        return wrapper

    return decorator


# --------------------------------------------------------------------------- agents


@timed("planner")
def planner_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    data, _ = call_json(
        "You are the Planner agent of an autonomous DataOps incident investigation system. "
        "Produce a concise, concrete investigation plan for the specialist agents "
        "(log analysis, knowledge retrieval, schema drift, risk, recovery).",
        f"{_incident_brief(inc)}\n\nReturn JSON: "
        '{"plan": ["step 1", "step 2", ...], "retrieval_query": "the single best search query '
        'for the enterprise knowledge base"}',
        state["meter"],
    )
    plan = data.get("plan") or ["Analyze logs", "Retrieve documentation", "Check schema drift"]
    query = data.get("retrieval_query") or inc.get("failure_description", "")
    return {
        "plan": plan,
        "rag": {"query": query},
        "summaries": {"planner": f"{len(plan)} investigation steps"},
    }


@timed("log")
def log_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    logs = (inc.get("logs") or "").strip()
    if not logs:
        return {
            "log_analysis": {"errors": [], "first_error": "", "evidence": [], "notes": "No logs provided."},
            "summaries": {"log": "no logs supplied"},
        }
    data, _ = call_json(
        "You are the Log Agent. Extract the real failure signal from raw pipeline logs. "
        "Quote log lines verbatim as evidence. Never invent log lines.",
        f"{_incident_brief(inc)}\n\nLOGS:\n{logs[:12000]}\n\n"
        'Return JSON: {"first_error": "...", "errors": ["..."], "failed_stage": "...", '
        '"evidence": [{"source": "pipeline log line N", "quote": "verbatim line"}], "notes": "..."}',
        state["meter"],
    )
    return {
        "log_analysis": data,
        "summaries": {"log": data.get("first_error", "log parsed")[:80]},
    }


@timed("rag")
def rag_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    query = (state.get("rag") or {}).get("query") or inc.get("failure_description", "")
    query = f"{inc.get('pipeline_name')} {query}"
    chunks = retrieve(query, TOP_K)
    return {
        "rag": {"query": query, "chunks": chunks},
        "summaries": {"rag": f"{len(chunks)} chunks retrieved from ChromaDB"},
    }


@timed("schema")
def schema_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    schema_info = (inc.get("schema_info") or "").strip()
    context = "\n\n".join(c["chunk"] for c in (state.get("rag") or {}).get("chunks", [])[:4])
    data, _ = call_json(
        "You are the Schema Agent. Compare expected and observed schemas and detect drift: "
        "missing columns, added columns, and type changes. Base every finding on the provided text.",
        f"{_incident_brief(inc)}\n\nSCHEMA INFORMATION:\n{schema_info[:8000]}\n\n"
        f"RELEVANT DOCUMENTATION:\n{context[:6000]}\n\n"
        'Return JSON: {"driftDetected": true/false, "missingColumns": ["..."], '
        '"typeChanges": ["col: OLD -> NEW"], "notes": "..."}',
        state["meter"],
    )
    return {
        "schema": data,
        "summaries": {
            "schema": ("drift detected" if data.get("driftDetected") else "no drift")
            + f" · {len(data.get('missingColumns') or [])} missing column(s)"
        },
    }


@timed("risk")
def risk_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    context = "\n\n".join(c["chunk"] for c in (state.get("rag") or {}).get("chunks", [])[:5])
    data, _ = call_json(
        "You are the Risk Agent. Determine severity, business impact, affected downstream systems "
        "and SLA risk. Use the documentation to identify real downstream consumers.",
        f"{_incident_brief(inc)}\n\nLOG ANALYSIS:\n{json.dumps(state.get('log_analysis', {}))[:4000]}\n\n"
        f"SCHEMA ANALYSIS:\n{json.dumps(state.get('schema', {}))[:3000]}\n\n"
        f"DOCUMENTATION:\n{context[:6000]}\n\n"
        'Return JSON: {"severity": "low|medium|high|critical", "affectedSystems": ["..."], '
        '"slaRisk": "...", "summary": "..."}',
        state["meter"],
    )
    return {"risk": data, "summaries": {"risk": f"severity {data.get('severity', 'unknown')}"}}


@timed("recovery")
def recovery_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    context = "\n\n".join(c["chunk"] for c in (state.get("rag") or {}).get("chunks", [])[:6])
    data, _ = call_json(
        "You are the Recovery Agent. Recommend concrete recovery steps grounded in the retrieved "
        "runbooks and contracts. You must NOT execute anything: recommendations require human "
        "approval. Cite the migration/runbook names that appear in the documentation.",
        f"{_incident_brief(inc)}\n\nSCHEMA ANALYSIS:\n{json.dumps(state.get('schema', {}))[:3000]}\n\n"
        f"RISK:\n{json.dumps(state.get('risk', {}))[:2000]}\n\n"
        f"RUNBOOKS AND DOCUMENTATION:\n{context[:8000]}\n\n"
        'Return JSON: {"steps": ["..."], "rationale": "...", "requiresApproval": true}',
        state["meter"],
    )
    data["requiresApproval"] = True
    return {"recovery": data, "summaries": {"recovery": f"{len(data.get('steps') or [])} recovery steps"}}


@timed("reviewer")
def reviewer_agent(state: GraphState) -> Dict[str, Any]:
    inc = state["incident"]
    context = "\n\n".join(
        f"[{c['document']}] {c['chunk']}" for c in (state.get("rag") or {}).get("chunks", [])[:6]
    )
    data, _ = call_json(
        "You are the Reviewer agent. Verify that the root cause and the recovery recommendation are "
        "supported by the logs, the schema information and the retrieved documents. Flag any claim "
        "that is not traceable to the supplied evidence. Also write the final incident summary, "
        "root cause statement and the evidence list (verbatim quotes only).",
        f"{_incident_brief(inc)}\n\nLOG ANALYSIS:\n{json.dumps(state.get('log_analysis', {}))[:4000]}\n\n"
        f"SCHEMA ANALYSIS:\n{json.dumps(state.get('schema', {}))[:3000]}\n\n"
        f"RISK:\n{json.dumps(state.get('risk', {}))[:2000]}\n\n"
        f"RECOVERY:\n{json.dumps(state.get('recovery', {}))[:3000]}\n\n"
        f"RETRIEVED DOCUMENTS:\n{context[:8000]}\n\n"
        'Return JSON: {"supported": true/false, "issues": ["unsupported claim ..."], "notes": "...", '
        '"summary": "3-4 sentence incident summary", "rootCause": "...", '
        '"evidence": [{"source": "log line | schema | document name", "quote": "verbatim"}], '
        '"supportedClaims": 0, "totalClaims": 0}',
        state["meter"],
    )
    return {
        "review": data,
        "summaries": {"reviewer": "supported" if data.get("supported") else "issues found"},
    }


@timed("evaluation")
def evaluation_agent(state: GraphState) -> Dict[str, Any]:
    review = state.get("review", {}) or {}
    chunks = (state.get("rag") or {}).get("chunks", [])
    meter: TokenMeter = state["meter"]

    total_claims = max(1, int(review.get("totalClaims") or 0) or 4)
    supported_claims = int(review.get("supportedClaims") or (total_claims if review.get("supported") else total_claims - len(review.get("issues") or [])))
    supported_claims = max(0, min(total_claims, supported_claims))

    retrieval_strength = min(1.0, sum(c["score"] for c in chunks) / max(1, len(chunks))) if chunks else 0.0
    groundedness = round(0.65 * (supported_claims / total_claims) + 0.35 * retrieval_strength, 4)

    issue_penalty = min(0.4, 0.1 * len(review.get("issues") or []))
    evidence_bonus = 0.1 if len(review.get("evidence") or []) >= 3 else 0.0
    confidence = round(max(0.05, min(0.99, groundedness + evidence_bonus - issue_penalty)), 4)
    hallucination = round(max(0.01, min(0.95, 1.0 - groundedness + issue_penalty / 2)), 4)

    return {
        "evaluation": {
            "confidence": confidence,
            "groundedness": groundedness,
            "hallucinationRisk": hallucination,
            "promptTokens": meter.prompt,
            "completionTokens": meter.completion,
            "totalTokens": meter.total,
            "estimatedCostUsd": round(meter.cost_usd, 6),
            "model": GROQ_MODEL,
        },
        "summaries": {"evaluation": f"confidence {int(confidence * 100)}%"},
    }


# --------------------------------------------------------------------------- graph

def build_graph():
    g = StateGraph(GraphState)
    g.add_node("planner", planner_agent)
    g.add_node("log", log_agent)
    g.add_node("rag_agent", rag_agent)
    g.add_node("schema_agent", schema_agent)
    g.add_node("risk_agent", risk_agent)
    g.add_node("recovery_agent", recovery_agent)
    g.add_node("reviewer_agent", reviewer_agent)
    g.add_node("evaluation_agent", evaluation_agent)

    g.add_edge(START, "planner")
    g.add_edge("planner", "log")
    g.add_edge("planner", "rag_agent")
    g.add_edge("rag_agent", "schema_agent")  # schema uses retrieved contract text
    g.add_edge("log", "risk_agent")
    g.add_edge("schema_agent", "risk_agent")
    g.add_edge("risk_agent", "recovery_agent")
    g.add_edge("recovery_agent", "reviewer_agent")
    g.add_edge("reviewer_agent", "evaluation_agent")
    g.add_edge("evaluation_agent", END)
    return g.compile()


GRAPH = build_graph()

SUCCESSORS = {
    "planner": ["log", "rag_agent"],
    "rag_agent": ["schema_agent"],
    "log": [],
    "schema_agent": [],
    "risk_agent": ["recovery_agent"],
    "recovery_agent": ["reviewer_agent"],
    "reviewer_agent": ["evaluation_agent"],
    "evaluation_agent": [],
}
AGENT_IDS = ["planner", "log", "rag_agent", "schema_agent", "risk_agent", "recovery_agent", "reviewer_agent", "evaluation_agent"]


def run_stream(incident: Dict[str, Any]) -> Iterator[str]:
    """Executes the graph, yielding NDJSON agent events then the final result."""
    started = time.perf_counter()
    meter = TokenMeter()
    state: Dict[str, Any] = {
        "incident": incident,
        "meter": meter,
        "durations": {},
        "summaries": {},
        "errors": [],
    }

    def event(payload: Dict[str, Any]) -> str:
        return json.dumps(payload) + "\n"

    final: Dict[str, Any] = dict(state)
    done: set = set()

    yield event({"type": "agent", "id": "planner", "status": "running"})
    try:
        for update in GRAPH.stream(state, stream_mode="updates"):
            for node, patch in update.items():
                if node not in AGENT_IDS:
                    continue
                final = {**final, **(patch or {})}
                final["durations"] = merge_dict(final.get("durations", {}), (patch or {}).get("durations", {}))
                final["summaries"] = merge_dict(final.get("summaries", {}), (patch or {}).get("summaries", {}))
                done.add(node)
                yield event(
                    {
                        "type": "agent",
                        "id": node,
                        "status": "completed",
                        "durationMs": int(final["durations"].get(node, 0)),
                        "summary": final["summaries"].get(node),
                    }
                )
                for nxt in SUCCESSORS.get(node, []):
                    if nxt not in done:
                        yield event({"type": "agent", "id": nxt, "status": "running"})
                if node in ("log", "schema_agent") and {"log", "schema_agent"} <= done and "risk_agent" not in done:
                    yield event({"type": "agent", "id": "risk_agent", "status": "running"})
    except Exception as exc:
        yield event({"type": "error", "message": f"LangGraph execution failed: {exc}"})
        return

    latency_ms = int((time.perf_counter() - started) * 1000)
    review = final.get("review", {}) or {}
    schema = final.get("schema", {}) or {}
    risk = final.get("risk", {}) or {}
    recovery = final.get("recovery", {}) or {}
    log_analysis = final.get("log_analysis", {}) or {}
    evaluation = final.get("evaluation", {}) or {}
    evaluation["latencyMs"] = latency_ms

    evidence = list(review.get("evidence") or []) or list(log_analysis.get("evidence") or [])

    investigation = {
        "id": str(uuid.uuid4()),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "input": {
            "pipelineName": incident.get("pipeline_name", ""),
            "source": incident.get("source", ""),
            "destination": incident.get("destination", ""),
            "executionId": incident.get("execution_id", ""),
            "failureDescription": incident.get("failure_description", ""),
            "logs": incident.get("logs", ""),
            "schemaInfo": incident.get("schema_info", ""),
            "documents": [{"name": d["name"], "content": ""} for d in incident.get("documents", [])],
        },
        "plan": final.get("plan", []),
        "agents": [],
        "summary": review.get("summary", ""),
        "rootCause": review.get("rootCause", "") or log_analysis.get("first_error", ""),
        "evidence": evidence,
        "retrievedChunks": (final.get("rag") or {}).get("chunks", []),
        "schemaAnalysis": {
            "driftDetected": bool(schema.get("driftDetected")),
            "missingColumns": schema.get("missingColumns") or [],
            "typeChanges": schema.get("typeChanges") or [],
            "notes": schema.get("notes", ""),
        },
        "businessImpact": {
            "severity": risk.get("severity", "medium"),
            "affectedSystems": risk.get("affectedSystems") or [],
            "slaRisk": risk.get("slaRisk", ""),
            "summary": risk.get("summary", ""),
        },
        "recovery": {
            "steps": recovery.get("steps") or [],
            "rationale": recovery.get("rationale", ""),
            "requiresApproval": True,
        },
        "review": {
            "supported": bool(review.get("supported", False)),
            "issues": review.get("issues") or [],
            "notes": review.get("notes", ""),
        },
        "evaluation": evaluation,
    }
    if final.get("errors"):
        investigation["error"] = "; ".join(final["errors"])

    yield event({"type": "result", "investigation": investigation})
