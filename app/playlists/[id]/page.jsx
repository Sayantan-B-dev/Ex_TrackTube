"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";
import AddPlaylistModal from "../../../components/AddPlaylistModal";
import ConfirmModal from "../../../components/ConfirmModal";
import Sidebar from "../../../components/Sidebar";
import VideoList from "../../../components/VideoList";
import { useCore } from "../../../lib/useCore";
import { formatDuration } from "../../../lib/format";

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id;
  const { core, dispatch, ready } = useCore();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");
  const [confirm, setConfirm] = useState(null); // "markAll" | "clearAll" | "reset"
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = (playlist, videos) =>
    dispatch({ type: "add", playlist, videos });

  const playlist = core.playlists?.[id];
  const data = core.data?.[id];
  const progress = core.progress?.[id] || { ids: [] };

  const videos = data?.videos || [];
  const markedIds = progress.ids || [];
  const markedSet = useMemo(() => new Set(markedIds), [markedIds]);

  const stats = useMemo(() => {
    const markedSeconds = videos
      .filter((v) => markedSet.has(v.id))
      .reduce((s, v) => s + (v.duration || 0), 0);
    const totalSeconds = videos.reduce((s, v) => s + (v.duration || 0), 0);
    return { markedSeconds, totalSeconds };
  }, [videos, markedSet]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return videos.filter((v) => {
      if (filterTab === "selected" && !markedSet.has(v.id)) return false;
      if (filterTab === "unmarked" && markedSet.has(v.id)) return false;
      if (q && !v.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [videos, search, filterTab, markedSet]);

  if (!mounted || !ready) {
    return (
      <div className="page">
        <NavBar onAddPlaylist={() => setModalOpen(true)} />
        <main className="main">
          <p className="empty-text">Loading playlist…</p>
        </main>
      </div>
    );
  }

  if (!playlist || !data) {
    return (
      <div className="page">
        <NavBar onAddPlaylist={() => setModalOpen(true)} />
        <AddPlaylistModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={() => {}} />
        <div className="empty-state">
          <div className="empty-icon" aria-hidden>
            ✕
          </div>
          <h2>Playlist not found</h2>
          <p>It may have been deleted or the link is wrong.</p>
          <Link href="/" className="btn btn-primary">
            ← Back to playlists
          </Link>
        </div>
      </div>
    );
  }

  const handleToggle = (videoId) => dispatch({ type: "toggle", id, videoId });

  const confirmConfig = {
    markAll: {
      title: "Mark all videos",
      message: `All ${videos.length} videos will be marked as watched. This adds ${formatDuration(stats.totalSeconds)} to your progress.`,
      confirmLabel: "Mark all",
    },
    clearAll: {
      title: "Clear all marks",
      message: `All ${markedIds.length} marked videos will be unmarked, removing ${formatDuration(stats.markedSeconds)} from your progress.`,
      confirmLabel: "Clear all",
    },
    reset: {
      title: "Reset progress",
      message:
        "Your selection will be wiped and progress goes back to 0%. This cannot be undone.",
      confirmLabel: "Reset",
      danger: true,
    },
  }[confirm];

  const runConfirm = () => {
    if (confirm === "markAll")
      dispatch({ type: "markAll", id, videoIds: videos.map((v) => v.id) });
    else if (confirm === "clearAll" || confirm === "reset")
      dispatch({ type: "clear", id });
    setConfirm(null);
  };

  return (
    <div className="page">
      <NavBar onAddPlaylist={() => setModalOpen(true)} />
      <AddPlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
      <ConfirmModal
        open={!!confirm}
        title={confirmConfig?.title}
        message={confirmConfig?.message}
        confirmLabel={confirmConfig?.confirmLabel}
        danger={confirmConfig?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={runConfirm}
      />
      <div className="layout">
        <Sidebar
          playlist={playlist}
          videos={videos}
          markedCount={markedIds.length}
          markedSeconds={stats.markedSeconds}
          totalSeconds={stats.totalSeconds}
          search={search}
          setSearch={setSearch}
          filterTab={filterTab}
          setFilterTab={setFilterTab}
          onMarkAll={() => setConfirm("markAll")}
          onClearAll={() => setConfirm("clearAll")}
          onResetProgress={() => setConfirm("reset")}
          savedAt={progress.savedAt}
        />
        <main className="main">
          <div className="main-bar">
            <span className="main-bar-title">
              {filterTab === "all" && "All videos"}
              {filterTab === "selected" && "Marked videos"}
              {filterTab === "unmarked" && "Not marked"}
              {search && ` · “${search}”`}
            </span>
            <span className="main-bar-info">
              {filtered.length} shown ·{" "}
              <strong>{formatDuration(stats.markedSeconds)}</strong> marked ·{" "}
              <strong style={{ color: "var(--success)" }}>
                {formatDuration(stats.totalSeconds - stats.markedSeconds)}
              </strong>{" "}
              left
            </span>
          </div>
          {filtered.length > 0 ? (
            <VideoList
              videos={filtered}
              markedIds={markedIds}
              markedSeconds={stats.markedSeconds}
              onToggle={handleToggle}
            />
          ) : (
            <p className="empty-text">No videos match this view.</p>
          )}
        </main>
      </div>
    </div>
  );
}