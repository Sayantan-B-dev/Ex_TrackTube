export const CORE_KEY = "tracktube:core";

export function emptyCore() {
  return { playlists: {}, data: {}, progress: {} };
}

export function loadCore() {
  try {
    const raw = localStorage.getItem(CORE_KEY);
    if (!raw) return emptyCore();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyCore();
    return {
      playlists: parsed.playlists || {},
      data: parsed.data || {},
      progress: parsed.progress || {},
    };
  } catch {
    return emptyCore();
  }
}

export function saveCore(core) {
  try {
    localStorage.setItem(CORE_KEY, JSON.stringify(core));
    return true;
  } catch {
    return false;
  }
}

export function addPlaylistToCore(core, playlist, videos) {
  const id = playlist.id;
  core.playlists[id] = {
    id,
    title: playlist.title,
    channel: playlist.channel,
    url: playlist.url,
    addedAt: new Date().toISOString(),
    totalVideos: videos.length,
    totalSeconds: videos.reduce((s, v) => s + (v.duration || 0), 0),
  };
  core.data[id] = { playlist: core.playlists[id], videos };
  core.progress[id] = core.progress[id] || { ids: [] };
  return core;
}

export function deletePlaylistFromCore(core, id) {
  delete core.playlists[id];
  delete core.data[id];
  delete core.progress[id];
  return core;
}

export function toggleVideoInProgress(progress, id, videoId) {
  const ids = progress?.ids || [];
  const set = new Set(ids);
  if (set.has(videoId)) set.delete(videoId);
  else set.add(videoId);
  return { ...(progress || {}), ids: [...set] };
}

export function setAllInProgress(progress, videoIds) {
  return { ...(progress || {}), ids: [...videoIds] };
}

export function clearProgress(progress) {
  return { ...(progress || {}), ids: [] };
}