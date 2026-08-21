import { checkRateLimit, recordFetch } from "../../../lib/rateLimit";
import { fetchPlaylist, validatePlaylistUrl } from "../../../lib/playlist";
import { getUserFromRequest, jsonError } from "../../../lib/auth";
import { listUserPlaylists } from "../../../lib/playlistDb";

export const runtime = "nodejs";

export async function GET(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser) {
    return jsonError(401, "unauthorized", "Missing or invalid token.");
  }

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sort") || "last_viewed_desc";

  try {
    const playlists = await listUserPlaylists(authUser.id, sortBy);
    return Response.json({ playlists });
  } catch {
    return jsonError(500, "db_error", "Could not load your playlists. Please try again.");
  }
}

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

  if (!validatePlaylistUrl(url)) {
    return Response.json(
      {
        error: "bad_request",
        message: "Please enter a valid YouTube playlist link (e.g. https://www.youtube.com/playlist?list=...)",
      },
      { status: 400 }
    );
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

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      (async () => {
        try {
          const result = await fetchPlaylist(url, (p) => {
            controller.enqueue(encoder.encode(JSON.stringify({ type: "progress", ...p }) + "\n"));
          });
          recordFetch(ip);
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