// import { createFileRoute, Link } from "@tanstack/react-router";
// import { useMemo } from "react";
// import {
//   Background,
//   Controls,
//   Handle,
//   Position,
//   ReactFlow,
//   type Edge,
//   type Node,
//   type NodeProps,
// } from "@xyflow/react";
// import "@xyflow/react/dist/style.css";
// import { AppShell } from "@/components/AppShell";
// import { FlowStrip, Panel } from "@/components/ui-kit";
// import { Button } from "@/components/ui/button";
// import { useAppState } from "@/lib/store";
// import { AGENT_ORDER, type AgentState, type AgentStatus } from "@/lib/types";
// import { cn } from "@/lib/utils";

// export const Route = createFileRoute("/workflow")({
//   head: () => ({
//     meta: [
//       { title: "Agent Workflow — PipelineMind AI" },
//       {
//         name: "description",
//         content:
//           "Live LangGraph workflow view: planner, log, RAG, schema, risk, recovery, reviewer and evaluation agents.",
//       },
//       { property: "og:title", content: "Agent Workflow — PipelineMind AI" },
//       {
//         property: "og:description",
//         content: "Live LangGraph multi-agent workflow with per-agent status and execution time.",
//       },
//     ],
//   }),
//   component: Workflow,
// });

// const STATUS_STYLE: Record<AgentStatus, string> = {
//   waiting: "border-border bg-card text-muted-foreground",
//   running: "border-primary bg-primary/10 text-primary running-ring",
//   completed: "border-success/60 bg-success/10 text-success",
//   failed: "border-destructive/60 bg-destructive/10 text-destructive",
// };

// type AgentNodeData = { agent: AgentState; role: string };

// function AgentNode({ data }: NodeProps) {
//   const { agent, role } = data as unknown as AgentNodeData;
//   return (
//     <div
//       className={cn(
//         "w-52 rounded-lg border px-3 py-2.5 shadow-panel transition-colors",
//         STATUS_STYLE[agent.status],
//       )}
//     >
//       <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-border" />
//       <div className="flex items-center justify-between gap-2">
//         <span className="text-sm font-semibold text-foreground">{agent.name}</span>
//         <span className="mono-xs uppercase">{agent.status}</span>
//       </div>
//       <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{role}</p>
//       <div className="mono-xs mt-2 flex items-center justify-between text-muted-foreground">
//         <span>{agent.durationMs != null ? `${(agent.durationMs / 1000).toFixed(2)}s` : "—"}</span>
//         {agent.status === "running" ? <span className="animate-pulse">executing</span> : null}
//       </div>
//       <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-border" />
//     </div>
//   );
// }

// const nodeTypes = { agent: AgentNode };

// function Workflow() {
//   const { agents, running, current, error } = useAppState();

//   const { nodes, edges } = useMemo(() => {
//     const byId = Object.fromEntries(agents.map((a) => [a.id, a]));
//     const pos: Record<string, { x: number; y: number }> = {
//       planner: { x: 260, y: 0 },
//       log: { x: 0, y: 140 },
//       rag: { x: 260, y: 140 },
//       schema: { x: 520, y: 140 },
//       risk: { x: 260, y: 290 },
//       recovery: { x: 260, y: 420 },
//       reviewer: { x: 260, y: 550 },
//       evaluation: { x: 260, y: 680 },
//     };
//     const nodes: Node[] = AGENT_ORDER.map((a) => ({
//       id: a.id,
//       type: "agent",
//       position: pos[a.id]!,
//       data: { agent: byId[a.id]!, role: a.role },
//     }));
//     const pairs: [string, string][] = [
//       ["planner", "log"],
//       ["planner", "rag"],
//       ["planner", "schema"],
//       ["log", "risk"],
//       ["rag", "risk"],
//       ["schema", "risk"],
//       ["risk", "recovery"],
//       ["recovery", "reviewer"],
//       ["reviewer", "evaluation"],
//     ];
//     const edges: Edge[] = pairs.map(([s, t]) => {
//       const active = byId[t]?.status === "running" || byId[s]?.status === "running";
//       return {
//         id: `${s}-${t}`,
//         source: s,
//         target: t,
//         animated: active,
//         style: {
//           stroke: byId[s]?.status === "completed" ? "var(--success)" : "var(--border)",
//           strokeWidth: 1.5,
//         },
//       };
//     });
//     return { nodes, edges };
//   }, [agents]);

//   return (
//     <AppShell
//       title="LangGraph Workflow"
//       subtitle="Planner → parallel Log / RAG / Schema → Risk → Recovery → Reviewer → Evaluation"
//       actions={
//         current ? (
//           <Button asChild size="sm" variant="secondary">
//             <Link to="/report">Open report</Link>
//           </Button>
//         ) : (
//           <Button asChild size="sm">
//             <Link to="/investigate">Configure incident</Link>
//           </Button>
//         )
//       }
//     >
//       <div className="space-y-6">
//         <FlowStrip />

//         {error ? (
//           <div className="panel border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
//             {error}
//           </div>
//         ) : null}

//         <div className="grid gap-6 xl:grid-cols-3">
//           <div className="panel h-[620px] overflow-hidden xl:col-span-2">
//             <ReactFlow
//               nodes={nodes}
//               edges={edges}
//               nodeTypes={nodeTypes}
//               fitView
//               proOptions={{ hideAttribution: true }}
//               nodesDraggable={false}
//               nodesConnectable={false}
//             >
//               <Background color="var(--grid-line)" gap={20} />
//               <Controls showInteractive={false} className="!border-border !bg-card" />
//             </ReactFlow>
//           </div>

//           <div className="space-y-4">
//             <Panel title="Execution timeline" hint={running ? "Streaming live from LangGraph" : "Last run"}>
//               <ul className="space-y-2">
//                 {agents.map((a) => (
//                   <li
//                     key={a.id}
//                     className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
//                   >
//                     <span
//                       className={cn(
//                         "size-2 shrink-0 rounded-full",
//                         a.status === "completed" && "bg-success",
//                         a.status === "running" && "bg-primary animate-pulse",
//                         a.status === "failed" && "bg-destructive",
//                         a.status === "waiting" && "bg-muted-foreground/50",
//                       )}
//                     />
//                     <div className="min-w-0 flex-1">
//                       <div className="text-sm font-medium">{a.name}</div>
//                       {a.summary ? (
//                         <div className="truncate text-xs text-muted-foreground">{a.summary}</div>
//                       ) : null}
//                     </div>
//                     <span className="mono-xs tabular-nums text-muted-foreground">
//                       {a.durationMs != null ? `${(a.durationMs / 1000).toFixed(2)}s` : "—"}
//                     </span>
//                   </li>
//                 ))}
//               </ul>
//             </Panel>

//             <Panel title="Investigation plan" hint="Produced by the Planner agent">
//               {current?.plan?.length ? (
//                 <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
//                   {current.plan.map((p, i) => (
//                     <li key={i}>{p}</li>
//                   ))}
//                 </ol>
//               ) : (
//                 <p className="py-4 text-center text-sm text-muted-foreground">
//                   The plan appears once the Planner agent completes.
//                 </p>
//               )}
//             </Panel>
//           </div>
//         </div>
//       </div>
//     </AppShell>
//   );
// }



import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AppShell } from "@/components/AppShell";
import { FlowStrip, Panel } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { AGENT_ORDER, type AgentState, type AgentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workflow")({
  head: () => ({
    meta: [
      { title: "Agent Workflow — PipelineMind AI" },
      {
        name: "description",
        content:
          "Live LangGraph workflow view: planner, log, RAG, schema, risk, recovery, reviewer and evaluation agents.",
      },
      {
        property: "og:title",
        content: "Agent Workflow — PipelineMind AI",
      },
      {
        property: "og:description",
        content:
          "Live LangGraph multi-agent workflow with per-agent status and execution time.",
      },
    ],
  }),
  component: Workflow,
});

const STATUS_STYLE: Record<AgentStatus, string> = {
  waiting: "border-border bg-card text-muted-foreground",
  running: "border-primary bg-primary/10 text-primary running-ring",
  completed: "border-success/60 bg-success/10 text-success",
  failed: "border-destructive/60 bg-destructive/10 text-destructive",
};

type AgentNodeData = {
  agent: AgentState;
  role: string;
};

function AgentNode({ data }: NodeProps) {
  const { agent, role } = data as unknown as AgentNodeData;

  return (
    <div
      className={cn(
        "w-52 rounded-lg border px-3 py-2.5 shadow-panel transition-colors",
        STATUS_STYLE[agent.status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          {agent.name}
        </span>

        <span className="mono-xs uppercase">
          {agent.status}
        </span>
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {role}
      </div>

      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>
          {agent.durationMs != null
            ? `${(agent.durationMs / 1000).toFixed(2)}s`
            : "—"}
        </span>

        {agent.status === "running" ? (
          <span className="animate-pulse">executing</span>
        ) : null}
      </div>
    </div>
  );
}

const nodeTypes = {
  agent: AgentNode,
};

function Workflow() {
  const { agents, running, current, error } = useAppState();

  const { nodes, edges } = useMemo(() => {
    const byId = Object.fromEntries(
      agents.map((a) => [a.id, a]),
    );

    /*
     * IMPORTANT:
     * These IDs must exactly match the backend LangGraph IDs.
     */
    const pos: Record<string, { x: number; y: number }> = {
      planner: { x: 260, y: 0 },

      log: { x: 0, y: 150 },

      rag_agent: { x: 260, y: 150 },

      schema_agent: { x: 520, y: 150 },

      risk_agent: { x: 260, y: 300 },

      recovery_agent: { x: 260, y: 430 },

      reviewer_agent: { x: 260, y: 560 },

      evaluation_agent: { x: 260, y: 690 },
    };

    const nodes: Node[] = AGENT_ORDER.map((a) => ({
      id: a.id,
      type: "agent",
      position: pos[a.id] ?? { x: 260, y: 0 },
      data: {
        agent: byId[a.id]!,
        role: a.role,
      },
    }));

    const pairs: [string, string][] = [
      ["planner", "log"],
      ["planner", "rag_agent"],
      ["rag_agent", "schema_agent"],
      ["log", "risk_agent"],
      ["schema_agent", "risk_agent"],
      ["risk_agent", "recovery_agent"],
      ["recovery_agent", "reviewer_agent"],
      ["reviewer_agent", "evaluation_agent"],
    ];

    const edges: Edge[] = pairs.map(([source, target]) => {
      const sourceAgent = byId[source];
      const targetAgent = byId[target];

      const active =
        sourceAgent?.status === "running" ||
        targetAgent?.status === "running";

      return {
        id: `${source}-${target}`,
        source,
        target,
        animated: active,
        style: {
          stroke:
            sourceAgent?.status === "completed"
              ? "var(--success)"
              : "var(--border)",
          strokeWidth: 1.5,
        },
      };
    });

    return { nodes, edges };
  }, [agents]);

  return (
    <AppShell
      title="LangGraph Workflow"
      subtitle="Planner → parallel Log / RAG → Schema → Risk → Recovery → Reviewer → Evaluation"
      actions={
        current ? (
          <Link to="/report">
            <Button size="sm">Open report</Button>
          </Link>
        ) : (
          <Link to="/investigate">
            <Button size="sm">Configure incident</Button>
          </Link>
        )
      }
    >
      <FlowStrip
        active={running ? 1 : current ? 3 : 0}
        steps={[
          "INPUT",
          "MULTI-AGENT LANGGRAPH",
          "RAG EVIDENCE",
          "INCIDENT REPORT",
        ]}
      />

      {error ? (
        <div className="panel border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="panel h-[620px] overflow-hidden xl:col-span-2">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
          >
            <Background color="var(--grid-line)" gap={20} />
            <Controls
              showInteractive={false}
              className="!border-border !bg-card"
            />
          </ReactFlow>
        </div>

        <div className="space-y-4">
          <Panel
            title="Execution timeline"
            hint={
              running
                ? "Streaming live from LangGraph"
                : "Last run"
            }
          >
            <ul className="space-y-2">
              {agents.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      a.status === "completed" && "bg-success",
                      a.status === "running" &&
                        "bg-primary animate-pulse",
                      a.status === "failed" &&
                        "bg-destructive",
                      a.status === "waiting" &&
                        "bg-muted-foreground/50",
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {a.name}
                    </div>

                    {a.summary ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {a.summary}
                      </div>
                    ) : null}
                  </div>

                  <span className="mono-xs tabular-nums text-muted-foreground">
                    {a.durationMs != null
                      ? `${(a.durationMs / 1000).toFixed(2)}s`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Investigation plan"
            hint="Produced by the Planner agent"
          >
            {current?.plan?.length ? (
              <ol className="list-decimal space-y-1.5 pl-4 text-sm text-muted-foreground">
                {current.plan.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ol>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                The plan appears once the Planner agent completes.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}