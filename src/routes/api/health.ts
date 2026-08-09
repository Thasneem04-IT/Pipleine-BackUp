import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const base = process.env["PIPELINE_API_URL"];
        if (!base) {
          return Response.json({ online: false, reason: "PIPELINE_API_URL is not configured" });
        }
        try {
          const res = await fetch(`${base.replace(/\/$/, "")}/health`, {
            signal: AbortSignal.timeout(5000),
          });
          const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
          return Response.json({ online: res.ok, backend: data });
        } catch (err) {
          return Response.json({
            online: false,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      },
    },
  },
});
