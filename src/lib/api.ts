import type { IncidentInput, StreamEvent } from "./types";
import { store } from "./store";

function toPayload(input: IncidentInput) {
  return {
    pipeline_name: input.pipelineName,
    source: input.source,
    destination: input.destination,
    execution_id: input.executionId,
    failure_description: input.failureDescription,
    logs: input.logs,
    schema_info: input.schemaInfo,
    documents: input.documents.map((d) => ({ name: d.name, content: d.content })),
  };
}

/** POSTs the incident and consumes the NDJSON agent-event stream from LangGraph. */
export async function runInvestigation(input: IncidentInput): Promise<void> {
  store.startRun();
  try {
    const res = await fetch("/api/investigate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(input)),
    });

    if (!res.ok || !res.body) {
      const detail = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null;
      store.fail(
        [detail?.error ?? `Request failed (${res.status})`, detail?.detail].filter(Boolean).join(" — "),
      );
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          store.applyEvent(JSON.parse(trimmed) as StreamEvent);
        } catch {
          /* ignore partial/non-JSON keepalive lines */
        }
      }
    }
    if (buffer.trim()) {
      try {
        store.applyEvent(JSON.parse(buffer.trim()) as StreamEvent);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    store.fail(err instanceof Error ? err.message : String(err));
    return;
  }
  store.finishRun();
}

export async function checkBackend(): Promise<boolean> {
  try {
    const res = await fetch("/api/health");
    const data = (await res.json()) as { online?: boolean };
    store.setBackendOnline(Boolean(data.online));
    return Boolean(data.online);
  } catch {
    store.setBackendOnline(false);
    return false;
  }
}

export interface KnowledgeStat {
  name: string;
  chunks: number;
  characters: number;
  ingested_at?: string;
}

export async function listKnowledge(): Promise<KnowledgeStat[]> {
  const res = await fetch("/api/knowledge");
  if (!res.ok) throw new Error(`Knowledge base unavailable (${res.status})`);
  const data = (await res.json()) as { documents?: KnowledgeStat[] };
  return data.documents ?? [];
}

export async function ingestKnowledge(documents: { name: string; content: string }[]) {
  const res = await fetch("/api/knowledge", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ documents }),
  });
  if (!res.ok) throw new Error(`Ingestion failed (${res.status})`);
  return (await res.json()) as { indexed: number; chunks: number };
}

export async function clearKnowledge() {
  const res = await fetch("/api/knowledge", { method: "DELETE" });
  if (!res.ok) throw new Error(`Clear failed (${res.status})`);
}
