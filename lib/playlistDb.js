import "server-only";
import { getRows, getRow, exec } from "./db";

export async function listUserPlaylists(userId, sortBy = "last_viewed_desc") {
  let orderClause = "position ASC";
  switch (sortBy) {
    case "time_asc":
      orderClause = "p.total_seconds ASC, position ASC";
      break;
    case "time_desc":
      orderClause = "p.total_seconds DESC, position ASC";
      break;
    case "title_asc":
      orderClause = "p.title ASC, position ASC";
      break;
    case "title_desc":
      orderClause = "p.title DESC, position ASC";
      break;
    case "added_desc":
      orderClause = "p.added_at DESC, position ASC";
      break;
    case "last_viewed_desc":
    default:
      orderClause = "p.last_viewed_at DESC NULLS LAST, p.added_at DESC, position ASC";
      break;
  }

  const sql = `
    SELECT p.*,
      pv.id AS pv_id, pv.youtube_id, pv.title AS pv_title, pv.duration AS pv_duration, pv.position AS pv_position,
      pr.video_id AS pr_video_id
    FROM playlists p
    LEFT JOIN playlist_videos pv ON pv.playlist_id = p.id
    LEFT JOIN progress pr ON pr.playlist_id = p.id AND pr.video_id = pv.id
    WHERE p.user_id = $1
    ORDER BY ${orderClause}
  `;
  const rows = await getRows(sql, [userId]);

  const playlistsMap = new Map();
  for (const row of rows) {
    const id = row.id;
    if (!playlistsMap.has(id)) {
      playlistsMap.set(id, {
        id: row.id,
        title: row.title,
        channel: row.channel,
        url: row.url,
        totalVideos: row.total_videos,
        totalSeconds: row.total_seconds,
        addedAt: row.added_at,
        updatedAt: row.updated_at,
        isCurrentlyWatching: row.is_currently_watching,
        lastViewedAt: row.last_viewed_at,
        videos: [],
        progressRows: [],
      });
    }
    const playlist = playlistsMap.get(id);
    if (row.pv_id && !playlist.videos.find((v) => v.id === row.pv_id)) {
      playlist.videos.push({
        id: row.pv_id,
        youtubeId: row.youtube_id,
        title: row.pv_title,
        duration: row.pv_duration,
        position: row.pv_position,
      });
    }
    if (row.pr_video_id && !playlist.progressRows.find((r) => r.video_id === row.pr_video_id)) {
      playlist.progressRows.push({ video_id: row.pr_video_id });
    }
  }

  const playlists = [];
  for (const playlist of playlistsMap.values()) {
    const markedIds = playlist.progressRows.map((r) => r.video_id).filter(Boolean);
    playlists.push({
      ...playlist,
      markedIds,
      markedCount: markedIds.length,
      markedSeconds: 0,
      videos: playlist.videos,
    });
  }

  return playlists;
}

export async function getUserPlaylist(userId, playlistId) {
  const playlist = await getRow(
    `SELECT * FROM playlists WHERE id = $1 AND user_id = $2`,
    [playlistId, userId]
  );
  if (!playlist) return null;

  const videos = await getRows(
    `SELECT id, youtube_id, title, duration, position FROM playlist_videos WHERE playlist_id = $1 ORDER BY position ASC`,
    [playlistId]
  );

  const progress = await getRows(
    `SELECT video_id FROM progress WHERE playlist_id = $1`,
    [playlistId]
  );

  const markedIds = progress.map((r) => r.video_id);

  return {
    id: playlist.id,
    title: playlist.title,
    channel: playlist.channel,
    url: playlist.url,
    totalVideos: playlist.total_videos,
    totalSeconds: playlist.total_seconds,
    addedAt: playlist.added_at,
    updatedAt: playlist.updated_at,
    videos,
    markedIds,
  };
}

export function createPlaylist(userId, { url, title, channel, videos }) {
  const p_videos = videos.map((v) => ({
    youtubeId: v.youtubeId,
    title: v.title || "Untitled",
    duration: v.duration || 0,
  }));
  return exec(
    `SELECT * FROM create_playlist($1, $2, $3, $4, $5::jsonb)`,
    [userId, url, title, channel || "", p_videos]
  );
}

export async function updatePlaylistProgress(userId, playlistId, youtubeIds) {
  try {
    await exec(
      `SELECT set_progress($1, $2, $3)`,
      [userId, playlistId, youtubeIds]
    );
  } catch (err) {
    if (err.code === "P0001" && err.message && err.message.includes("playlist not found")) {
      throw new Error("not_found");
    }
    throw err;
  }
}

export async function renameUserPlaylist(userId, playlistId, title) {
  const result = await getRow(
    `UPDATE playlists SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3 RETURNING id`,
    [title, playlistId, userId]
  );
  return !!result;
}

export async function deleteUserPlaylist(userId, playlistId) {
  const result = await getRow(
    `DELETE FROM playlists WHERE id = $1 AND user_id = $2 RETURNING id`,
    [playlistId, userId]
  );
  return !!result;
}

export async function updatePlaylistCurrentlyWatching(userId, playlistId, val) {
  await exec(
    `UPDATE playlists SET is_currently_watching = $1, updated_at = now() WHERE id = $2 AND user_id = $3`,
    [val, playlistId, userId]
  );
}

export async function touchLastViewed(userId, playlistId) {
  await exec(
    `UPDATE playlists SET last_viewed_at = now() WHERE id = $1 AND user_id = $2`,
    [playlistId, userId]
  );
}
