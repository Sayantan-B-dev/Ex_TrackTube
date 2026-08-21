import "server-only";
import { supabase } from "./supabase";

export async function listUserPlaylists(userId, sortBy = "last_viewed_desc") {
  let query = supabase
    .from("playlists")
    .select(
      "id, title, channel, url, total_videos, total_seconds, added_at, updated_at, is_currently_watching, last_viewed_at, " +
        "playlist_videos!playlist_videos_playlist_id_fkey(id, youtube_id, title, duration, position), " +
        "progress(video_id, playlist_videos!inner(youtube_id, duration))"
    )
    .eq("user_id", userId);

  // Apply sorting
  switch (sortBy) {
    case "time_asc":
      query = query.order("total_seconds", { ascending: true });
      break;
    case "time_desc":
      query = query.order("total_seconds", { ascending: false });
      break;
    case "title_asc":
      query = query.order("title", { ascending: true });
      break;
    case "title_desc":
      query = query.order("title", { ascending: false });
      break;
    case "added_desc":
      query = query.order("added_at", { ascending: false });
      break;
    case "last_viewed_desc":
    default:
      query = query.order("last_viewed_at", { ascending: false, nullsFirst: false })
        .order("added_at", { ascending: false });
      break;
  }

  query = query.order("position", { referencedTable: "playlist_videos", ascending: true });

  const { data: playlists, error } = await query;

  if (error) throw new Error("db_error");
  if (!playlists || playlists.length === 0) return [];

  return playlists.map((p) => {
    const marked = p.progress || [];
    return {
      id: p.id,
      title: p.title,
      channel: p.channel,
      url: p.url,
      totalVideos: p.total_videos,
      totalSeconds: p.total_seconds,
      addedAt: p.added_at,
      updatedAt: p.updated_at,
      isCurrentlyWatching: p.is_currently_watching,
      lastViewedAt: p.last_viewed_at,
      videos: (p.playlist_videos || []).map((v) => ({
        id: v.id,
        youtubeId: v.youtube_id,
        title: v.title,
        duration: v.duration,
        position: v.position,
      })),
      markedIds: marked.map((r) => r.playlist_videos?.youtube_id).filter(Boolean),
      markedCount: marked.length,
      markedSeconds: marked.reduce((s, r) => s + (r.playlist_videos?.duration || 0), 0),
    };
  });
}

export async function getUserPlaylist(userId, playlistId) {
  const { data: playlist, error } = await supabase
    .from("playlists")
    .select(
      "id, title, channel, url, total_videos, total_seconds, added_at, updated_at, playlist_videos(id, youtube_id, title, duration, position)"
    )
    .eq("id", playlistId)
    .eq("user_id", userId)
    .order("position", { referencedTable: "playlist_videos", ascending: true })
    .maybeSingle();

  if (error) throw new Error("db_error");
  if (!playlist) return null;

  const { data: progress } = await supabase
    .from("progress")
    .select("video_id")
    .eq("playlist_id", playlistId);

  return {
    id: playlist.id,
    title: playlist.title,
    channel: playlist.channel,
    url: playlist.url,
    totalVideos: playlist.total_videos,
    totalSeconds: playlist.total_seconds,
    addedAt: playlist.added_at,
    updatedAt: playlist.updated_at,
    videos: (playlist.playlist_videos || []).map((v) => ({
      id: v.id,
      youtubeId: v.youtube_id,
      title: v.title,
      duration: v.duration,
      position: v.position,
    })),
    markedIds: (progress || []).map((r) => r.video_id),
  };
}

export function createPlaylist(userId, { url, title, channel, videos }) {
  return supabase.rpc("create_playlist", {
    p_user_id: userId,
    p_url: url,
    p_title: title,
    p_channel: channel || "",
    p_videos: videos,
  });
}

export async function updatePlaylistProgress(userId, playlistId, youtubeIds) {
  const { data, error } = await supabase.rpc("set_progress", {
    p_user_id: userId,
    p_playlist_id: playlistId,
    p_youtube_ids: youtubeIds,
  });

  if (error?.code === "PGRST202") {
    return updateProgressFallback(userId, playlistId, youtubeIds);
  }
  if (error) throw new Error("db_error");
  return data;
}

async function updateProgressFallback(userId, playlistId, youtubeIds) {
  const { data: playlist } = await supabase
    .from("playlists")
    .select("id")
    .eq("id", playlistId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!playlist) throw new Error("not_found");

  const { data: videos, error: vErr } = await supabase
    .from("playlist_videos")
    .select("id")
    .eq("playlist_id", playlistId)
    .in("youtube_id", youtubeIds);
  if (vErr) throw new Error("db_error");

  const { error: dErr } = await supabase
    .from("progress")
    .delete()
    .eq("playlist_id", playlistId);
  if (dErr) throw new Error("db_error");

  const videoIds = (videos || []).map((v) => v.id);
  if (videoIds.length > 0) {
    const { error: iErr } = await supabase.from("progress").insert(
      videoIds.map((videoId) => ({ playlist_id: playlistId, video_id: videoId }))
    );
    if (iErr) throw new Error("db_error");
  }
}

export async function renameUserPlaylist(userId, playlistId, title) {
  const { data, error } = await supabase
    .from("playlists")
    .update({ title })
    .eq("id", playlistId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("db_error");
  return !!data;
}

export async function deleteUserPlaylist(userId, playlistId) {
  const { data, error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error("db_error");
  return !!data;
}