import { type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const year  = req.nextUrl.searchParams.get("year")  ?? "2026";
  const round = req.nextUrl.searchParams.get("round") ?? "1";

  const offline = () =>
    new Response(
      `data: ${JSON.stringify({ error: "backend_offline" })}\n\n`,
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );

  try {
    const upstream = await fetch(
      `http://localhost:8000/api/replay/${year}/${round}`,
      { signal: req.signal }
    );

    if (!upstream.ok || !upstream.body) return offline();

    return new Response(upstream.body, {
      headers: {
        "Content-Type":      "text/event-stream",
        "Cache-Control":     "no-cache, no-transform",
        "Connection":        "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return offline();
  }
}
