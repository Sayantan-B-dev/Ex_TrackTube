"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { TOKEN_KEY, useAuth } from "./useAuth";
import {
  CORE_KEY,
  emptyCore,
  loadCore,
  saveCore,
  addPlaylistToCore,
  deletePlaylistFromCore,
  toggleVideoInProgress,
  setAllInProgress,
  clearProgress,
} from "./storage";
import { formatDuration } from "./format";

function reducer(core, action) {
  switch (action.type) {
    case "reload":
      return action.core;
    case "add":
      return addPlaylistToCore(core, action.playlist, action.videos);
    case "delete":
      return deletePlaylistFromCore(core, action.id);
    case "toggle":
      return {
        ...core,
        progress: {
          ...core.progress,
          [action.id]: toggleVideoInProgress(
            core.progress[action.id],
            action.id,
            action.videoId
          ),
        },
      };
    case "markAll":
      return {
        ...core,
        progress: {
          ...core.progress,
          [action.id]: setAllInProgress(core.progress[action.id], action.videoIds),
        },
      };
    case "clear":
      return {
        ...core,
        progress: {
          ...core.progress,
          [action.id]: clearProgress(core.progress[action.id]),
        },
      };
    case "reset":
      return emptyCore();
    default:
      return core;
  }
}

async function api(path, options, token) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function touchSavedAt(core, next, id) {
  const prog = next.progress[id];
  return {
    ...next,
    progress: {
      ...next.progress,
      [id]: { ...(prog || {}), savedAt: new Date().toISOString() },
    },
  };
}

function videoFromDb(v) {
  const duration = v.duration || 0;
  const ytId = v.youtubeId || v.youtube_id;
  return {
    id: ytId,
    uuid: v.id,
    title: v.title || "Untitled",
    duration,
    thumbnail: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
    index: (v.position ?? 0) + 1,
    durationString: formatDuration(duration),
  };
}

function coreFromApi(playlists = []) {
  const core = emptyCore();
  for (const p of playlists) {
    const id = p.id;
    const videos = (p.videos || []).map(videoFromDb);
    const entry = {
      id,
      title: p.title || "Untitled",
      channel: p.channel || "",
      url: p.url,
      addedAt: p.addedAt || new Date().toISOString(),
      totalVideos: p.totalVideos ?? videos.length,
      totalSeconds: p.totalSeconds ?? 0,
    };
    core.playlists[id] = entry;
    core.data[id] = { playlist: entry, videos };
    core.progress[id] = {
      ids: (p.markedIds || []).filter(Boolean),
      savedAt: p.updatedAt || undefined,
    };
  }
  return core;
}

export function useCore() {
  const { user, loading: authLoading, logout } = useAuth();
  const coreRef = useRef(emptyCore());
  const [core, dispatchRaw] = useReducer(reducer, coreRef.current);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    if (authLoading) return;

    async function load() {
      if (user) {
        try {
          const token = localStorage.getItem(TOKEN_KEY) || "";
          const data = await api("/api/playlists", {}, token);
          if (cancelled) return;
          const next = coreFromApi(data.playlists || []);
          coreRef.current = next;
          dispatchRaw({ type: "reload", core: next });
        } catch (err) {
          if (err.message === "unauthorized") logout();
        } finally {
          if (!cancelled) setReady(true);
        }
      } else {
        const next = loadCore();
        coreRef.current = next;
        dispatchRaw({ type: "reload", core: next });
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, logout]);

  const dispatch = useCallback(
    async (action) => {
      if (!user) {
        const next = reducer(coreRef.current, action);
        coreRef.current = next;
        saveCore(next);
        dispatchRaw({ type: "reload", core: next });
        return null;
      }

      const token = localStorage.getItem(TOKEN_KEY) || "";
      const id = action.id;

      try {
        if (action.type === "add") {
          const payload = {
            url: action.playlist.url,
            title: action.playlist.title,
            channel: action.playlist.channel || "",
            videos: action.videos.map((v) => ({
              youtubeId: v.id,
              title: v.title,
              duration: v.duration || 0,
            })),
          };
          const data = await api(
            "/api/playlists/save",
            { method: "POST", body: JSON.stringify(payload) },
            token
          );
          const newId = data.playlist.id;
          const videos = (data.videos || []).map(videoFromDb);
          const entry = {
            id: newId,
            title: data.playlist.title || action.playlist.title,
            channel: data.playlist.channel || action.playlist.channel,
            url: data.playlist.url || action.playlist.url,
            addedAt: data.playlist.added_at || new Date().toISOString(),
            totalVideos: videos.length,
            totalSeconds: videos.reduce((s, v) => s + (v.duration || 0), 0),
          };
          const next = {
            ...coreRef.current,
            playlists: { ...coreRef.current.playlists, [newId]: entry },
            data: {
              ...coreRef.current.data,
              [newId]: { playlist: entry, videos },
            },
            progress: { ...coreRef.current.progress, [newId]: { ids: [] } },
          };
          coreRef.current = next;
          dispatchRaw({ type: "reload", core: next });
          return entry;
        }

        if (action.type === "delete") {
          await api(`/api/playlists/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
          const next = deletePlaylistFromCore(coreRef.current, id);
          coreRef.current = next;
          dispatchRaw({ type: "reload", core: next });
          return null;
        }

        if (action.type === "toggle" || action.type === "markAll" || action.type === "clear") {
          let next = reducer(coreRef.current, action);
          next = touchSavedAt(coreRef.current, next, id);
          coreRef.current = next;
          dispatchRaw({ type: "reload", core: next });
          await api(
            `/api/playlists/${encodeURIComponent(id)}`,
            {
              method: "PATCH",
              body: JSON.stringify({ videoIds: next.progress[id]?.ids || [] }),
            },
            token
          );
          return null;
        }

        if (action.type === "reload") {
          const next = action.core;
          coreRef.current = next;
          dispatchRaw(action);
          return null;
        }
      } catch (err) {
        if (err.message === "unauthorized") {
          logout();
          return null;
        }
        if (action.type === "add") throw err;
      }
      return null;
    },
    [user, logout]
  );

  const playlists = Object.values(core.playlists || {}).sort((a, b) =>
    (b.addedAt || "").localeCompare(a.addedAt || "")
  );

  return { core, dispatch, playlists, ready };
}