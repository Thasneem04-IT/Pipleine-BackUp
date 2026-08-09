import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, FlowStrip, Metric, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Incident Report — PipelineMind AI" },
      {
        name: "description",
        content:
          "Root cause, evidence, schema analysis, business impact and recovery recommendation for the investigated pipeline failure.",
      },
      { property: "og:title", content: "Incident Report — PipelineMind AI" },
      {
        property: "og:description",
        content: "Grounded root-cause analysis and recovery plan for a failed data pipeline.",
      },
    ],
  }),
  component: Report,
});

function Report() {
  const { current } = useAppState();

  if (!current) {
    return (
      <AppShell title="Incident Report" subtitle="No investigation loaded">
        <EmptyState
          title="Nothing to report yet"
          description="Run an investigation to generate a grounded incident report with root cause, evidence, schema analysis, impact and recovery steps."
          action={
            <Button asChild>
              <Link to="/investigate">Start an investigation</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const { input, evaluation, schemaAnalysis, businessImpact, recovery, review } = current;

  return (
    <AppShell
      title={`Incident Report — ${input.pipelineName}`}
      subtitle={`${input.source} → ${input.destination} · ${input.executionId || "no execution id"} · ${new Date(current.createdAt).toLocaleString()}`}
      actions={
        <Button asChild size="sm" variant="secondary">
          <Link to="/evaluation">Evaluation metrics</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <FlowStrip />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Severity"
            value={String(businessImpact.severity).toUpperCase()}
            tone="danger"
            sub={businessImpact.slaRisk}
          />
          <Metric
            label="Confidence"
            value={`${Math.round(evaluation.confidence * 100)}%`}
            tone="info"
          />
          <Metric
            label="Groundedness"
            value={`${Math.round(evaluation.groundedness * 100)}%`}
            tone="success"
          />
          <Metric
            label="Hallucination risk"
            value={`${Math.round(evaluation.hallucinationRisk * 100)}%`}
            tone={evaluation.hallucinationRisk > 0.25 ? "danger" : "success"}
          />
        </div>

        <Panel title="Incident summary">
          <p className="text-sm leading-relaxed">{current.summary}</p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Root cause">
            <p className="text-sm leading-relaxed">{current.rootCause}</p>
          </Panel>

          <Panel title="Reviewer verdict" hint="Are all claims supported by evidence?">
            <div className="flex items-start gap-3">
              {review.supported ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              )}
              <div className="space-y-2 text-sm">
                <p className="leading-relaxed">{review.notes}</p>
                {review.issues.length ? (
                  <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                    {review.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="Evidence" hint="Direct citations from logs, schema and retrieved documents">
          <ul className="space-y-3">
            {current.evidence.map((e, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <div className="mono-xs text-primary">{e.source}</div>
                <p className="mt-1.5 whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                  {e.quote}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Retrieved documents" hint="ChromaDB similarity results used as agent context">
          <ul className="space-y-3">
            {current.retrievedChunks.map((c, i) => (
              <li key={i} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="mono-xs truncate text-accent">{c.document}</span>
                  <Badge variant="outline" className="mono-xs border-border text-muted-foreground">
                    {c.score.toFixed(3)}
                  </Badge>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {c.chunk}
                </p>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Schema analysis">
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    schemaAnalysis.driftDetected
                      ? "bg-destructive/15 text-destructive"
                      : "bg-success/15 text-success"
                  }
                >
                  {schemaAnalysis.driftDetected ? "Schema drift detected" : "No drift detected"}
                </Badge>
              </div>
              <div>
                <div className="label-caps">Missing columns</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {schemaAnalysis.missingColumns.length ? (
                    schemaAnalysis.missingColumns.map((c) => (
                      <span
                        key={c}
                        className="mono-xs rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-destructive"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <div className="label-caps">Type changes</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {schemaAnalysis.typeChanges.length ? (
                    schemaAnalysis.typeChanges.map((c) => (
                      <span
                        key={c}
                        className="mono-xs rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-warning"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <p className="leading-relaxed text-muted-foreground">{schemaAnalysis.notes}</p>
            </div>
          </Panel>

          <Panel title="Business impact">
            <div className="space-y-4 text-sm">
              <p className="leading-relaxed">{businessImpact.summary}</p>
              <div>
                <div className="label-caps">Affected systems</div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {businessImpact.affectedSystems.map((s) => (
                    <span
                      key={s}
                      className="mono-xs rounded border border-border bg-secondary px-2 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="label-caps">SLA risk</div>
                <p className="mt-1 text-muted-foreground">{businessImpact.slaRisk}</p>
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="Recovery recommendation"
          hint="Advisory only — PipelineMind never executes production actions"
        >
          <div className="space-y-4 text-sm">
            <ol className="list-decimal space-y-2 pl-5">
              {recovery.steps.map((s, i) => (
                <li key={i} className="leading-relaxed">
                  {s}
                </li>
              ))}
            </ol>
            <p className="leading-relaxed text-muted-foreground">{recovery.rationale}</p>
            <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-warning">
              <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                Human approval required. No migration, backfill or rerun is triggered automatically.
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
