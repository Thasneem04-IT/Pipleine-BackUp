import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Coins, Database } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, FlowStrip, Metric, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { store, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PipelineMind AI" },
      {
        name: "description",
        content:
          "Operational overview of autonomous data pipeline incident investigations: confidence, groundedness, latency and cost.",
      },
      { property: "og:title", content: "Dashboard — PipelineMind AI" },
      {
        property: "og:description",
        content: "Operational overview of autonomous data pipeline incident investigations.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { history, current, backendOnline } = useAppState();

  const avg = (fn: (h: (typeof history)[number]) => number) =>
    history.length ? history.reduce((s, h) => s + fn(h), 0) / history.length : 0;

  const totalCost = history.reduce((s, h) => s + h.evaluation.estimatedCostUsd, 0);

  return (
    <AppShell
      title="DataOps Incident Command"
      subtitle="Autonomous multi-agent investigation of failed data pipelines"
      actions={
        <Button asChild size="sm">
          <Link to="/investigate">
            New investigation <ArrowRight className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <FlowStrip />

        {backendOnline === false ? (
          <div className="panel flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div className="text-sm">
              <p className="font-medium text-warning">FastAPI backend unreachable</p>
              <p className="mt-1 text-muted-foreground">
                Start the LangGraph service in <span className="mono-xs">backend/</span> (
                <span className="mono-xs">uvicorn app.main:app --port 8000</span>) and make sure the
                <span className="mono-xs"> PIPELINE_API_URL</span> secret points at it. Investigations
                run entirely on your server — no mock responses are produced here.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Investigations"
            value={String(history.length)}
            sub="stored locally in this session"
          />
          <Metric
            label="Avg confidence"
            value={`${Math.round(avg((h) => h.evaluation.confidence) * 100)}%`}
            tone="info"
            sub="reviewer-weighted"
          />
          <Metric
            label="Avg groundedness"
            value={`${Math.round(avg((h) => h.evaluation.groundedness) * 100)}%`}
            tone="success"
            sub="claims backed by retrieved evidence"
          />
          <Metric
            label="Total spend"
            value={`$${totalCost.toFixed(4)}`}
            tone="warning"
            sub="OpenAI token cost estimate"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Recent investigations"
            hint="Every run is a real LangGraph execution against your backend"
            className="lg:col-span-2"
          >
            {history.length === 0 ? (
              <EmptyState
                title="No investigations yet"
                description="Load the sales_daily_etl demo incident or paste your own pipeline logs, schema and knowledge documents to start the multi-agent workflow."
                action={
                  <Button asChild>
                    <Link to="/investigate">Investigate an incident</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                    <Database className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{h.input.pipelineName}</div>
                      <div className="mono-xs truncate text-muted-foreground">
                        {h.input.source} → {h.input.destination} · {h.input.executionId || "no exec id"}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-border text-muted-foreground">
                      {h.businessImpact.severity}
                    </Badge>
                    <span className="mono-xs tabular-nums text-muted-foreground">
                      {Math.round(h.evaluation.confidence * 100)}% conf
                    </span>
                    <Button asChild size="sm" variant="secondary">
                      <Link to="/report" onClick={() => store.selectInvestigation(h.id)}>
                        Open
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Latest run" hint="Snapshot of the most recent report">
            {current ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="label-caps">Root cause</div>
                  <p className="mt-1 leading-relaxed">{current.rootCause}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md border border-border p-3">
                    <div className="mono-xs flex items-center gap-1.5 text-muted-foreground">
                      <Clock className="size-3" /> latency
                    </div>
                    <div className="mt-1 tabular-nums font-semibold">
                      {(current.evaluation.latencyMs / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <div className="mono-xs flex items-center gap-1.5 text-muted-foreground">
                      <Coins className="size-3" /> tokens
                    </div>
                    <div className="mt-1 tabular-nums font-semibold">
                      {current.evaluation.totalTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {current.review.supported ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : (
                    <AlertTriangle className="size-4 text-warning" />
                  )}
                  <span className="text-muted-foreground">
                    {current.review.supported
                      ? "Reviewer: diagnosis supported by evidence"
                      : "Reviewer: unsupported claims detected"}
                  </span>
                </div>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/report">View full report</Link>
                </Button>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Run an investigation to populate this panel.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
