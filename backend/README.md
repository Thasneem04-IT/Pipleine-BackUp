# PipelineMind AI — FastAPI / LangGraph / ChromaDB backend

Real multi-agent investigation service. No mock responses: every agent call hits
the Groq API, and retrieval hits a persistent ChromaDB collection.

## Run

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

export GROQ_API_KEY=gsk_...            # required
export GROQ_MODEL=llama-3.3-70b-versatile   # optional
uvicorn app.main:app --reload --port 8000
```

Then set the `PIPELINE_API_URL` secret in the Lovable project to the URL of this
service (e.g. `http://localhost:8000` for local dev, or your deployed HTTPS URL).
The frontend never talks to Groq directly — it calls same-origin `/api/*` routes
that proxy to this service, so the key stays server-side.

## Endpoints

| Method | Path                  | Purpose                                            |
| ------ | --------------------- | -------------------------------------------------- |
| GET    | `/health`             | liveness + model/key status                         |
| GET    | `/knowledge`          | indexed documents and chunk counts                  |
| POST   | `/knowledge`          | chunk → embed → upsert into ChromaDB                |
| DELETE | `/knowledge`          | drop the collection                                 |
| POST   | `/investigate/stream` | run the LangGraph workflow, stream NDJSON events    |

## Workflow

```
START → planner ─┬→ log ────────┐
                 └→ rag → schema┴→ risk → recovery → reviewer → evaluation → END
```

Agents: Planner, Log, RAG, Schema, Risk, Recovery, Reviewer, Evaluation.
The Recovery agent is advisory only — nothing is executed against production.

## Stream protocol (NDJSON, one JSON object per line)

```json
{"type":"agent","id":"planner","status":"running"}
{"type":"agent","id":"planner","status":"completed","durationMs":812,"summary":"5 investigation steps"}
{"type":"result","investigation":{ ... }}
{"type":"error","message":"..."}
```
