import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Activity,
  BookOpen,
  FileText,
  GaugeCircle,
  LayoutDashboard,
  Network,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAppState } from "@/lib/store";
import { checkBackend } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/investigate", label: "Investigate", icon: Search },
  { to: "/workflow", label: "Workflow", icon: Network },
  { to: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { to: "/report", label: "Incident Report", icon: FileText },
  { to: "/evaluation", label: "Evaluation", icon: GaugeCircle },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { backendOnline, running } = useAppState();

  useEffect(() => {
    void checkBackend();
    const id = setInterval(() => void checkBackend(), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface/80 backdrop-blur md:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">PipelineMind AI</div>
            <div className="mono-xs text-muted-foreground">DataOps incident agent</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className: "bg-primary/12 text-primary border-primary/30",
              }}
              inactiveProps={{
                className: "text-muted-foreground border-transparent hover:bg-secondary/60",
              }}
              className="flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-5 py-4">
          <div className="label-caps mb-1.5">Backend</div>
          <div className="flex items-center gap-2 mono-xs">
            <span
              className={cn(
                "size-2 rounded-full",
                backendOnline === null
                  ? "bg-muted-foreground"
                  : backendOnline
                    ? "bg-success"
                    : "bg-destructive",
              )}
            />
            <span className="text-muted-foreground">
              {backendOnline === null
                ? "checking…"
                : backendOnline
                  ? "FastAPI connected"
                  : "FastAPI offline"}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur md:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {running ? (
              <span className="mono-xs flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                investigation running
              </span>
            ) : null}
            {actions}
          </div>
        </header>
        <div className="flex-1 px-5 py-6 md:px-8">{children}</div>
        <nav className="sticky bottom-0 flex gap-1 overflow-x-auto border-t border-border bg-surface/95 px-3 py-2 backdrop-blur md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex min-w-16 flex-col items-center gap-1 px-2 py-1 text-[10px] font-medium"
            >
              <item.icon className="size-4" />
              {item.label.split(" ")[0]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
