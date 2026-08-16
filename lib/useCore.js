"use client";

import { useEffect, useReducer } from "react";
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

export function useCore() {
  const [core, dispatch] = useReducer(reducer, null, () => loadCore());

  useEffect(() => {
    saveCore(core);
  }, [core]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === CORE_KEY) {
        dispatch({ type: "reload", core: loadCore() });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const playlists = Object.values(core.playlists || {}).sort((a, b) =>
    (b.addedAt || "").localeCompare(a.addedAt || "")
  );

  return { core, dispatch, playlists };
}