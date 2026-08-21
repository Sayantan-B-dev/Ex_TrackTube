import { getUserFromRequest, jsonError } from "../../../../lib/auth";
import { supabase } from "../../../../lib/supabase";
import {
  getUserPlaylist,
  updatePlaylistProgress,
  renameUserPlaylist,
  deleteUserPlaylist,
} from "../../../../lib/playlistDb";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) {
    return jsonError(401, "unauthorized", "Missing or invalid token.");
  }
  const { id } = await params;

  try {
    const playlist = await getUserPlaylist(authUser.id, id);
    if (!playlist) {
      return jsonError(404, "not_found", "Playlist not found.");
    }
    return Response.json({ playlist });
  } catch {
    return jsonError(500, "db_error", "Could not load the playlist. Please try again.");
  }
}

export async function PATCH(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) {
    return jsonError(401, "unauthorized", "Missing or invalid token.");
  }
  const { id } = await params;

  let body = null;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "bad_request", "Invalid JSON body.");
  }

  try {
    if (Array.isArray(body?.videoIds)) {
      const videoIds = body.videoIds.filter((videoId) => typeof videoId === "string");
      await updatePlaylistProgress(authUser.id, id, videoIds);
      return Response.json({ ok: true, markedCount: videoIds.length });
    }

    if (typeof body?.title === "string") {
      const title = body.title.trim();
      if (!title) {
        return jsonError(400, "bad_request", "Title cannot be empty.");
      }
      const renamed = await renameUserPlaylist(authUser.id, id, title);
      if (!renamed) {
        return jsonError(404, "not_found", "Playlist not found.");
      }
      return Response.json({ ok: true, title });
    }

    if (typeof body?.currentlyWatching === "boolean") {
      const { error } = await supabase
        .from("playlists")
        .update({ is_currently_watching: body.currentlyWatching })
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (error) throw error;
      return Response.json({ ok: true, currentlyWatching: body.currentlyWatching });
    }

    if (body?.touchLastViewed === true) {
      const { error } = await supabase
        .from("playlists")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", authUser.id);
      if (error) throw error;
      return Response.json({ ok: true });
    }

    return jsonError(400, "bad_request", "Send videoIds (array), title, currentlyWatching (boolean), or touchLastViewed (true).");
  } catch (err) {
    if (err?.message === "not_found") {
      return jsonError(404, "not_found", "Playlist not found.");
    }
    return jsonError(500, "db_error", "Could not update the playlist. Please try again.");
  }
}

export async function DELETE(req, { params }) {
  const authUser = getUserFromRequest(req);
  if (!authUser) {
    return jsonError(401, "unauthorized", "Missing or invalid token.");
  }
  const { id } = await params;

  try {
    const deleted = await deleteUserPlaylist(authUser.id, id);
    if (!deleted) {
      return jsonError(404, "not_found", "Playlist not found.");
    }
    return Response.json({ ok: true });
  } catch {
    return jsonError(500, "db_error", "Could not delete the playlist. Please try again.");
  }
}