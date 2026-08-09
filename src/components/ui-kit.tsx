import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Panel({
  title,
  hint,
  actions,
  className,
  children,
}: {
  title?: string;
  hint?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
            {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-info",
  }[tone];
  return (
    <div className="panel p-4">
      <div className="label-caps">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums tracking-tight", toneClass)}>
        {value}
      </div>
      {sub ? <div className="mono-xs mt-1 text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function ScoreBar({
  label,
  value,
  invert = false,
}: {
  label: string;
  value: number;
  invert?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const good = invert ? pct <= 25 : pct >= 75;
  const mid = invert ? pct <= 50 : pct >= 50;
  const color = good ? "bg-success" : mid ? "bg-warning" : "bg-destructive";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="mono-xs tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function FlowStrip() {
  const steps = ["INPUT", "MULTI-AGENT LANGGRAPH", "RAG EVIDENCE", "INCIDENT REPORT"];
  return (
    <div className="panel flex flex-wrap items-center gap-2 px-4 py-3">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "mono-xs rounded-md border px-2.5 py-1 font-semibold",
              i === 0 && "border-info/40 bg-info/10 text-info",
              i === 1 && "border-primary/40 bg-primary/10 text-primary",
              i === 2 && "border-accent/40 bg-accent/10 text-accent",
              i === 3 && "border-success/40 bg-success/10 text-success",
            )}
          >
            {s}
          </span>
          {i < steps.length - 1 ? <span className="text-muted-foreground">→</span> : null}
        </div>
      ))}
    </div>
  );
}
