export function emptyCore() {
  return { playlists: {}, data: {}, progress: {} };
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
  return { ...(progress || {}), ids: [...set], savedAt: new Date().toISOString() };
}

export function setAllInProgress(progress, videoIds) {
  return { ...(progress || {}), ids: [...videoIds], savedAt: new Date().toISOString() };
}

export function clearProgress(progress) {
  return { ...(progress || {}), ids: [], savedAt: new Date().toISOString() };
}