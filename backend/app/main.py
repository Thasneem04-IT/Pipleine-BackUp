"""FastAPI entrypoint for PipelineMind AI."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import ALLOWED_ORIGINS, GROQ_API_KEY, GROQ_MODEL
from .graph import run_stream
from .rag import clear, ingest, list_documents
from .schemas import IncidentRequest, KnowledgeRequest

app = FastAPI(title="PipelineMind AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": GROQ_MODEL, "groq_key_configured": bool(GROQ_API_KEY)}


@app.get("/knowledge")
def get_knowledge():
    return {"documents": list_documents()}


@app.post("/knowledge")
def post_knowledge(req: KnowledgeRequest):
    return ingest([d.model_dump() for d in req.documents])


@app.delete("/knowledge")
def delete_knowledge():
    clear()
    return {"cleared": True}


@app.post("/investigate/stream")
def investigate_stream(req: IncidentRequest):
    incident = req.model_dump()
    # Any documents attached to this incident are indexed before retrieval runs.
    if incident.get("documents"):
        ingest(incident["documents"])
    return StreamingResponse(run_stream(incident), media_type="application/x-ndjson")
