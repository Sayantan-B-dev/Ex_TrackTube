import { getUserFromRequest, jsonError } from "../../../../lib/auth";
import { createPlaylist } from "../../../../lib/playlistDb";
import { validatePlaylistUrl } from "../../../../lib/playlist";
import { supabase } from "../../../../lib/supabase";

export const runtime = "nodejs";

export async function POST(req) {
  const authUser = getUserFromRequest(req);
  if (!authUser) {
    return jsonError(401, "unauthorized", "Missing or invalid token.");
  }

  let body = null;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "bad_request", "Invalid JSON body.");
  }

  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const channel = typeof body?.channel === "string" ? body.channel.trim() : "";
  const videos = Array.isArray(body?.videos) ? body.videos : null;

  if (!validatePlaylistUrl(url)) {
    return jsonError(400, "bad_request", "Please enter a valid YouTube playlist link.");
  }
  if (!title) {
    return jsonError(400, "bad_request", "Playlist title is required.");
  }
  if (!videos || videos.length === 0) {
    return jsonError(400, "bad_request", "At least one video is required.");
  }
  if (videos.some((v) => !v?.youtubeId || typeof v.youtubeId !== "string")) {
    return jsonError(400, "bad_request", "Every video needs a youtubeId.");
  }

  const payload = videos.map((v, i) => ({
    youtubeId: String(v.youtubeId),
    title: typeof v.title === "string" ? v.title : "Untitled",
    duration: Number.isFinite(v.duration) ? Math.max(0, Math.round(v.duration)) : 0,
    position: i,
  }));

  const { data: playlist, error } = await createPlaylist(authUser.id, {
    url,
    title,
    channel,
    videos: payload,
  });

  if (error) {
    return jsonError(500, "db_error", "Could not save the playlist. Please try again.");
  }

  const { data: savedVideos, error: videosError } = await supabase
    .from("playlist_videos")
    .select("id, youtube_id, title, duration, position")
    .eq("playlist_id", playlist.id)
    .order("position", { ascending: true });

  if (videosError) {
    return jsonError(500, "db_error", "Playlist created but videos could not be loaded.");
  }

  return Response.json(
    {
      playlist: {
        id: playlist.id,
        title: playlist.title,
        channel: playlist.channel,
        url: playlist.url,
        total_videos: playlist.total_videos,
        total_seconds: playlist.total_seconds,
        added_at: playlist.added_at,
      },
      videos: (savedVideos || []).map((v) => ({
        id: v.id,
        youtubeId: v.youtube_id,
        title: v.title,
        duration: v.duration,
        position: v.position,
      })),
    },
    { status: 201 }
  );
}