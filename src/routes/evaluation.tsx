import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Metric, Panel, ScoreBar } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation — PipelineMind AI" },
      {
        name: "description",
        content:
          "Confidence, groundedness, hallucination risk, latency, token usage and estimated Groq cost per investigation.",
      },
      { property: "og:title", content: "Evaluation — PipelineMind AI" },
      {
        property: "og:description",
        content: "Quality and cost telemetry for every multi-agent pipeline investigation.",
      },
    ],
  }),
  component: Evaluation,
});

function Evaluation() {
  const { current, history, agents } = useAppState();

  if (!current) {
    return (
      <AppShell title="Evaluation" subtitle="No investigation loaded">
        <EmptyState
          title="No evaluation data"
          description="The Evaluation agent computes confidence, groundedness, hallucination risk, latency, tokens and cost after each run."
          action={
            <Button asChild>
              <Link to="/investigate">Start an investigation</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const e = current.evaluation;
  const agentTimes = agents
    .filter((a) => a.durationMs != null)
    .map((a) => ({ name: a.name.replace(" Agent", ""), seconds: +(a.durationMs! / 1000).toFixed(2) }));
  const trend = [...history]
    .reverse()
    .map((h, i) => ({
      run: `#${i + 1}`,
      confidence: Math.round(h.evaluation.confidence * 100),
      groundedness: Math.round(h.evaluation.groundedness * 100),
      hallucination: Math.round(h.evaluation.hallucinationRisk * 100),
    }));

  return (
    <AppShell
      title="Evaluation & Observability"
      subtitle={`Model ${e.model} · ${current.input.pipelineName}`}
      actions={
        <Button asChild size="sm" variant="secondary">
          <Link to="/report">Back to report</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Investigation time"
            value={`${(e.latencyMs / 1000).toFixed(2)}s`}
            sub="end-to-end LangGraph run"
          />
          <Metric
            label="Total tokens"
            value={e.totalTokens.toLocaleString()}
            tone="info"
            sub={`${e.promptTokens.toLocaleString()} in · ${e.completionTokens.toLocaleString()} out`}
          />
          <Metric
            label="Estimated cost"
            value={`$${e.estimatedCostUsd.toFixed(5)}`}
            tone="warning"
            sub="Groq pricing estimate"
          />
          <Metric
            label="Hallucination risk"
            value={`${Math.round(e.hallucinationRisk * 100)}%`}
            tone={e.hallucinationRisk > 0.25 ? "danger" : "success"}
            sub="unsupported-claim probability"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Quality scores" hint="Computed by the Evaluation agent">
            <div className="space-y-5">
              <ScoreBar label="Confidence" value={e.confidence} />
              <ScoreBar label="Groundedness" value={e.groundedness} />
              <ScoreBar label="Hallucination risk" value={e.hallucinationRisk} invert />
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                Groundedness measures the share of report claims traceable to retrieved chunks, logs
                or schema input. Hallucination risk is its inverse, adjusted by reviewer findings (
                {current.review.issues.length} issue{current.review.issues.length === 1 ? "" : "s"}
                ).
              </div>
            </div>
          </Panel>

          <Panel title="Per-agent execution time">
            {agentTimes.length ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={agentTimes} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        color: "var(--foreground)",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="seconds" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No timing data.</p>
            )}
          </Panel>
        </div>

        <Panel title="Quality trend across runs" hint="Compare investigations in this session">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis
                  dataKey="run"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="confidence" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="groundedness" stroke="var(--chart-4)" strokeWidth={2} dot={false} />
                <Line
                  type="monotone"
                  dataKey="hallucination"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
