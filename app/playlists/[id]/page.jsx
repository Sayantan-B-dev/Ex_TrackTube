"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";
import AddPlaylistModal from "../../../components/AddPlaylistModal";
import Sidebar from "../../../components/Sidebar";
import VideoList from "../../../components/VideoList";
import { useCore } from "../../../lib/useCore";
import { formatDuration } from "../../../lib/format";

export default function PlaylistPage() {
  const params = useParams();
  const id = params.id;
  const { core, dispatch } = useCore();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all");

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

  return (
    <div className="page">
      <NavBar onAddPlaylist={() => setModalOpen(true)} />
      <AddPlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={() => {}}
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
          onMarkAll={() => dispatch({ type: "markAll", id, videoIds: videos.map((v) => v.id) })}
          onClearAll={() => dispatch({ type: "clear", id })}
          onResetProgress={() => dispatch({ type: "clear", id })}
          savedAt={null}
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