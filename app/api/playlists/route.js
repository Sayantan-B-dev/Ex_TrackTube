import { checkRateLimit, recordFetch } from "../../../lib/rateLimit";
import { fetchPlaylist } from "../../../lib/playlist";

export const runtime = "nodejs";

export async function POST(req) {
  let body = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad_request", message: "Invalid JSON body." }, { status: 400 });
  }

  const url = body?.url;
  if (!url || typeof url !== "string") {
    return Response.json({ error: "bad_request", message: "Missing playlist URL." }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";

  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return Response.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  recordFetch(ip);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const result = await fetchPlaylist(url, (p) => {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", ...p }) + "\n"));
          });
          controller.enqueue(encoder.encode(JSON.stringify({ type: "done", data: result }) + "\n"));
        } catch (err) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "error", message: err.message || "Unknown error" }) + "\n")
          );
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}