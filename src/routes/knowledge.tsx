import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, FileUp, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Metric, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { clearKnowledge, ingestKnowledge, listKnowledge } from "@/lib/api";
import { DEMO_DOCS } from "@/lib/demo";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — PipelineMind AI" },
      {
        name: "description",
        content:
          "Ingest runbooks, data contracts and postmortems into ChromaDB for retrieval-augmented incident investigation.",
      },
      { property: "og:title", content: "Knowledge Base — PipelineMind AI" },
      {
        property: "og:description",
        content: "Chunk, embed and index enterprise documents into the ChromaDB vector store.",
      },
    ],
  }),
  component: Knowledge,
});

function Knowledge() {
  const { backendOnline, current } = useAppState();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (backendOnline) setEnabled(true);
  }, [backendOnline]);

  const docsQuery = useQuery({
    queryKey: ["knowledge"],
    queryFn: listKnowledge,
    enabled,
    retry: false,
  });

  const ingest = useMutation({
    mutationFn: ingestKnowledge,
    onSuccess: (res) => {
      toast.success(`Indexed ${res.indexed} document(s) → ${res.chunks} chunks`);
      void qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: clearKnowledge,
    onSuccess: () => {
      toast.success("Vector store cleared");
      void qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const docs = docsQuery.data ?? [];
  const totalChunks = docs.reduce((s, d) => s + d.chunks, 0);

  return (
    <AppShell
      title="Knowledge Base"
      subtitle="Documents → chunking → embeddings → ChromaDB → retrieval → agent context"
      actions={
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.txt,.csv,.md,text/plain"
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              const payload = await Promise.all(
                files.map(async (f) => {
                  const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
                  if (isPdf) {
                    const buf = await f.arrayBuffer();
                    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                    return { name: f.name, content: `data:application/pdf;base64,${b64}` };
                  }
                  return { name: f.name, content: await f.text() };
                }),
              );
              e.target.value = "";
              if (payload.length) ingest.mutate(payload);
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => ingest.mutate(DEMO_DOCS)}
            disabled={ingest.isPending}
          >
            <Sparkles className="size-4" /> Index demo docs
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={ingest.isPending}>
            <FileUp className="size-4" /> Upload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["knowledge"] })}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Indexed documents" value={String(docs.length)} sub="persisted in ChromaDB" />
          <Metric label="Vector chunks" value={String(totalChunks)} tone="info" sub="retrievable units" />
          <Metric
            label="Chunks retrieved last run"
            value={String(current?.retrievedChunks.length ?? 0)}
            tone="success"
            sub="used as agent context"
          />
        </div>

        <Panel
          title="Vector store contents"
          hint="Persisted collection served by the FastAPI backend"
          actions={
            docs.length ? (
              <Button variant="ghost" size="sm" onClick={() => clear.mutate()}>
                <Trash2 className="size-4" /> Clear store
              </Button>
            ) : null
          }
        >
          {docsQuery.isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              {(docsQuery.error as Error).message}
            </p>
          ) : docs.length === 0 ? (
            <EmptyState
              title="Knowledge base is empty"
              description="Index the demo pipeline documentation, data contract, runbook and postmortem — or upload your own PDFs, text and CSV files. Retrieval quality drives the groundedness score."
              action={
                <Button onClick={() => ingest.mutate(DEMO_DOCS)} disabled={ingest.isPending}>
                  Index demo documents
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {docs.map((d) => (
                <li key={d.name} className="flex items-center gap-3 py-3 first:pt-0">
                  <Database className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{d.name}</span>
                  <span className="mono-xs text-muted-foreground">{d.chunks} chunks</span>
                  <span className="mono-xs text-muted-foreground">
                    {(d.characters / 1000).toFixed(1)}k chars
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Last retrieval"
          hint="Chunks the RAG agent pulled for the most recent investigation"
        >
          {current?.retrievedChunks.length ? (
            <ul className="space-y-3">
              {current.retrievedChunks.map((c, i) => (
                <li key={i} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="mono-xs truncate text-primary">{c.document}</span>
                    <span className="mono-xs tabular-nums text-muted-foreground">
                      score {c.score.toFixed(3)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {c.chunk}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No retrieval yet — run an investigation to see the chunks that grounded the diagnosis.
            </p>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
