import { createFileRoute } from "@tanstack/react-router";

/**
 * Streaming proxy to the FastAPI / LangGraph backend.
 * The Groq key and backend URL never reach the browser.
 */
export const Route = createFileRoute("/api/investigate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const base = process.env["PIPELINE_API_URL"];
        if (!base) {
          return new Response(JSON.stringify({ error: "PIPELINE_API_URL is not configured" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
        const body = await request.text();
        try {
          const upstream = await fetch(`${base.replace(/\/$/, "")}/investigate/stream`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          });
          if (!upstream.ok || !upstream.body) {
            const detail = await upstream.text().catch(() => "");
            return new Response(
              JSON.stringify({ error: `Backend returned ${upstream.status}`, detail }),
              { status: 502, headers: { "content-type": "application/json" } },
            );
          }
          return new Response(upstream.body, {
            status: 200,
            headers: {
              "content-type": "application/x-ndjson",
              "cache-control": "no-cache, no-transform",
            },
          });
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: "Cannot reach the FastAPI backend",
              detail: err instanceof Error ? err.message : String(err),
            }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
