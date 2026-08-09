import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileUp, Play, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FlowStrip, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { store, useAppState } from "@/lib/store";
import { DEMO_INCIDENT } from "@/lib/demo";
import { runInvestigation } from "@/lib/api";
import type { KnowledgeDoc } from "@/lib/types";

export const Route = createFileRoute("/investigate")({
  head: () => ({
    meta: [
      { title: "Investigate Incident — PipelineMind AI" },
      {
        name: "description",
        content:
          "Submit pipeline logs, schema information and knowledge documents to launch a multi-agent LangGraph investigation.",
      },
      { property: "og:title", content: "Investigate Incident — PipelineMind AI" },
      {
        property: "og:description",
        content: "Launch a multi-agent LangGraph investigation of a failed data pipeline.",
      },
    ],
  }),
  component: Investigate,
});

function Investigate() {
  const { input, running, backendOnline } = useAppState();
  const navigate = useNavigate();
  const logFileRef = useRef<HTMLInputElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const readFiles = async (files: FileList | null): Promise<KnowledgeDoc[]> => {
    if (!files) return [];
    const out: KnowledgeDoc[] = [];
    for (const file of Array.from(files)) {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const buf = await file.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        out.push({ name: file.name, content: `data:application/pdf;base64,${b64}` });
      } else {
        out.push({ name: file.name, content: await file.text() });
      }
    }
    return out;
  };

  const onStart = async () => {
    if (!input.pipelineName.trim() || !input.failureDescription.trim()) {
      toast.error("Pipeline name and failure description are required.");
      return;
    }
    if (backendOnline === false) {
      toast.error("FastAPI backend is offline. Start it before running an investigation.");
      return;
    }
    void navigate({ to: "/workflow" });
    await runInvestigation(input);
    const { error } = store.getState();
    if (error) {
      toast.error(error);
    } else {
      toast.success("Investigation complete");
      void navigate({ to: "/report" });
    }
  };

  return (
    <AppShell
      title="Investigate Incident"
      subtitle="Everything below is editable — the demo is a starting point, not a fixture"
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              store.replaceInput(DEMO_INCIDENT);
              toast.success("Demo incident loaded — edit any field before running");
            }}
          >
            <Sparkles className="size-4" /> Load demo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => store.reset()}>
            <RotateCcw className="size-4" /> Clear
          </Button>
          <Button size="sm" onClick={() => void onStart()} disabled={running}>
            <Play className="size-4" /> {running ? "Running…" : "Start investigation"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <FlowStrip />

        <div className="grid gap-6 xl:grid-cols-3">
          <Panel title="Incident metadata" className="xl:col-span-1">
            <div className="space-y-4">
              <Field
                label="Pipeline name"
                value={input.pipelineName}
                placeholder="sales_daily_etl"
                onChange={(v) => store.setInput({ pipelineName: v })}
              />
              <Field
                label="Source"
                value={input.source}
                placeholder="CRM API"
                onChange={(v) => store.setInput({ source: v })}
              />
              <Field
                label="Destination"
                value={input.destination}
                placeholder="Snowflake"
                onChange={(v) => store.setInput({ destination: v })}
              />
              <Field
                label="Execution ID"
                value={input.executionId}
                placeholder="run_2026_08_09_0214"
                onChange={(v) => store.setInput({ executionId: v })}
              />
              <div className="space-y-1.5">
                <Label htmlFor="failure">Failure description</Label>
                <Textarea
                  id="failure"
                  rows={5}
                  value={input.failureDescription}
                  placeholder="customer_age column not found during transform…"
                  onChange={(e) => store.setInput({ failureDescription: e.target.value })}
                />
              </div>
            </div>
          </Panel>

          <div className="space-y-6 xl:col-span-2">
            <Panel
              title="Pipeline logs"
              hint="Paste log text or upload a .txt / .log file"
              actions={
                <>
                  <input
                    ref={logFileRef}
                    type="file"
                    accept=".txt,.log,text/plain"
                    className="hidden"
                    onChange={async (e) => {
                      const docs = await readFiles(e.target.files);
                      if (docs[0]) store.setInput({ logs: docs[0].content });
                      e.target.value = "";
                    }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => logFileRef.current?.click()}>
                    <FileUp className="size-4" /> Upload log
                  </Button>
                </>
              }
            >
              <Textarea
                rows={10}
                className="font-mono text-xs"
                value={input.logs}
                placeholder="2026-08-09T02:14:12Z ERROR transform.normalize KeyError: 'customer_age'"
                onChange={(e) => store.setInput({ logs: e.target.value })}
              />
            </Panel>

            <Panel title="Schema information" hint="Expected vs. observed columns and types">
              <Textarea
                rows={8}
                className="font-mono text-xs"
                value={input.schemaInfo}
                placeholder="customer_id STRING NOT NULL&#10;customer_age INTEGER"
                onChange={(e) => store.setInput({ schemaInfo: e.target.value })}
              />
            </Panel>

            <Panel
              title="Knowledge documents"
              hint="Runbooks, contracts, postmortems — chunked, embedded and indexed in ChromaDB"
              actions={
                <>
                  <input
                    ref={docFileRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.csv,.md,text/plain"
                    className="hidden"
                    onChange={async (e) => {
                      setReading(true);
                      const docs = await readFiles(e.target.files);
                      store.setInput({ documents: [...input.documents, ...docs] });
                      setReading(false);
                      e.target.value = "";
                      toast.success(`${docs.length} document(s) attached`);
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={reading}
                    onClick={() => docFileRef.current?.click()}
                  >
                    <FileUp className="size-4" /> Add documents
                  </Button>
                </>
              }
            >
              {input.documents.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No documents attached. The RAG agent will have no enterprise context to ground its
                  answer.
                </p>
              ) : (
                <ul className="space-y-2">
                  {input.documents.map((doc, i) => (
                    <li
                      key={`${doc.name}-${i}`}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <Badge variant="outline" className="mono-xs border-primary/40 text-primary">
                        {doc.name.split(".").pop()?.toUpperCase()}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-sm">{doc.name}</span>
                      <span className="mono-xs text-muted-foreground">
                        {(doc.content.length / 1000).toFixed(1)}k chars
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() =>
                          store.setInput({
                            documents: input.documents.filter((_, idx) => idx !== i),
                          })
                        }
                      >
                        <X className="size-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {input.documents.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => store.setInput({ documents: [] })}
                >
                  <Trash2 className="size-4" /> Remove all
                </Button>
              ) : null}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
