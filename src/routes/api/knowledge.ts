import { createFileRoute } from "@tanstack/react-router";

async function proxy(path: string, init?: RequestInit) {
  const base = process.env["PIPELINE_API_URL"];
  if (!base) {
    return new Response(JSON.stringify({ error: "PIPELINE_API_URL is not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  try {
    const upstream = await fetch(`${base.replace(/\/$/, "")}${path}`, init);
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
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
}

export const Route = createFileRoute("/api/knowledge")({
  server: {
    handlers: {
      GET: async () => proxy("/knowledge"),
      POST: async ({ request }) =>
        proxy("/knowledge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: await request.text(),
        }),
      DELETE: async () => proxy("/knowledge", { method: "DELETE" }),
    },
  },
});
