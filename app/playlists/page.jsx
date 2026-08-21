"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import AddPlaylistModal from "../../components/AddPlaylistModal";
import ConfirmModal from "../../components/ConfirmModal";
import LoginRequired from "../../components/LoginRequired";
import SyncIndicator from "../../components/SyncIndicator";
import Footer from "../../components/Footer";
import { useCore } from "../../lib/useCore";
import { useAuth } from "../../lib/useAuth";
import { formatDuration, humanize } from "../../lib/format";

export default function PlaylistsPage() {
  const { user, loading: authLoading } = useAuth();
  const { core, dispatch, playlists, ready, busy } = useCore();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sortBy, setSortBy] = useState("last_viewed_desc");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAdd = (playlist, videos) =>
    dispatch({ type: "add", playlist, videos });

  const handleToggleWatching = (id, val) =>
    dispatch({ type: "currentlyWatching", id, currentlyWatching: val });

  const deleting = deleteId ? playlists.find((p) => p.id === deleteId) : null;

  const watching = playlists
    .filter((p) => p.isCurrentlyWatching)
    .sort((a, b) => {
      const at = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
      const bt = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
      return bt - at;
    });

  const others = playlists
    .filter((p) => !p.isCurrentlyWatching)
    .sort((a, b) => {
      switch (sortBy) {
        case "time_asc":
          return a.totalSeconds - b.totalSeconds;
        case "time_desc":
          return b.totalSeconds - a.totalSeconds;
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        case "added_desc":
          return (b.addedAt || "").localeCompare(a.addedAt || "");
        case "last_viewed_desc":
        default: {
          const at = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
          const bt = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
          if (at && bt) return bt - at;
          if (at) return -1;
          if (bt) return 1;
          return (b.addedAt || "").localeCompare(a.addedAt || "");
        }
      }
    });

  if (!mounted || authLoading || !ready) {
    return (
      <div className="page page-scroll">
        <NavBar onAddPlaylist={() => setModalOpen(true)} />
        <main className="container">
          <div className="page-head">
            <h1>Your playlists</h1>
            <p>Loading…</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page page-scroll">
        <NavBar />
        <main className="container">
          <LoginRequired
            title="Log in first"
            message="Your playlists are private and stored in your account. Log in or create an account to see them."
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page page-scroll">
      <NavBar onAddPlaylist={() => setModalOpen(true)} />
      <AddPlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />
      <ConfirmModal
        open={!!deleteId}
        title="Delete playlist"
        message={`"${deleting?.title || ""}" and all of its videos and progress will be permanently removed from your account. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          dispatch({ type: "delete", id: deleteId });
          setDeleteId(null);
        }}
      />
      <SyncIndicator busy={busy} />

      <main className="container">
        <div className="page-head">
          <h1>Your playlists</h1>
          <div className="page-head-controls">
            <select
              className="btn"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort playlists"
            >
              <option value="last_viewed_desc">Last viewed ↓</option>
              <option value="added_desc">Recently added ↓</option>
              <option value="time_desc">Total time ↓</option>
              <option value="time_asc">Total time ↑</option>
              <option value="title_asc">Title A–Z</option>
              <option value="title_desc">Title Z–A</option>
            </select>
          </div>
        </div>

        {playlists.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden>▦</div>
            <h2>No playlists yet</h2>
            <p>Paste any YouTube playlist link to start tracking it.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setModalOpen(true)}>
              + Add your first playlist
            </button>
          </div>
        ) : (
          <>
            {watching.length > 0 && (
              <>
                <h2 className="section-label">Currently watching</h2>
                <div className="playlist-grid">
                  {watching.map((p) => (
                    <PlaylistCard
                      key={p.id}
                      p={p}
                      core={core}
                      onToggleWatching={handleToggleWatching}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              </>
            )}

            {watching.length > 0 && others.length > 0 && (
              <hr className="section-divider" />
            )}

            {others.length > 0 && (
              <>
                <h2 className="section-label">Not started</h2>
                <div className="playlist-grid">
                  {others.map((p) => (
                    <PlaylistCard
                      key={p.id}
                      p={p}
                      core={core}
                      onToggleWatching={handleToggleWatching}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function PlaylistCard({ p, core, onToggleWatching, onDelete }) {
  const prog = core.progress[p.id] || { ids: [] };
  const markedSeconds = (core.data[p.id]?.videos || [])
    .filter((v) => prog.ids.includes(v.id))
    .reduce((s, v) => s + (v.duration || 0), 0);
  const pct =
    p.totalSeconds > 0
      ? Math.round((markedSeconds / p.totalSeconds) * 100)
      : 0;

  return (
    <div className="playlist-card">
      <div className="playlist-card-top">
        <Link href={`/playlists/${p.id}`} className="playlist-card-link">
          <h3 className="playlist-card-title">{p.title}</h3>
        </Link>
        <div className="playlist-card-actions">
          <button
            className={`btn ${p.isCurrentlyWatching ? "btn-primary" : ""}`}
            onClick={() => onToggleWatching(p.id, !p.isCurrentlyWatching)}
          >
            {p.isCurrentlyWatching ? "Currently watching" : "Not started"}
          </button>
        </div>
      </div>
      <p className="playlist-card-channel">{p.channel}</p>
      <div className="playlist-card-stats">
        <span>{p.totalVideos} videos</span>
        <span>{formatDuration(p.totalSeconds)}</span>
        <span>{humanize(p.totalSeconds)}</span>
      </div>
      <div className="playlist-card-progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
        <div className="playlist-card-progress-meta">
          <span>
            {prog.ids.length} marked · {formatDuration(markedSeconds)}
          </span>
          <span>{pct}%</span>
        </div>
      </div>
      <div className="playlist-card-bottom">
        <Link href={`/playlists/${p.id}`} className="btn btn-block">
          Open →
        </Link>
        <button
          className="btn btn-danger"
          onClick={() => onDelete(p.id)}
          aria-label="Delete playlist"
          title="Delete playlist"
        >
          Delete
        </button>
      </div>
    </div>
  );
}