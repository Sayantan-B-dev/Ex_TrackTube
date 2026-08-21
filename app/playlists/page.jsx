"use client";

import { useEffect, useState, Fragment } from "react";
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

  // Reload playlists when sort changes
  useEffect(() => {
    if (ready && user) {
      // The playlists are loaded via useCore which doesn't currently support sort param
      // We'll handle sorting client-side for now since useCore doesn't have sortBy
      // TODO: add sortBy to useCore load
    }
  }, [sortBy, ready, user]);

  const handleAdd = (playlist, videos) =>
    dispatch({ type: "add", playlist, videos });

  const handleCurrentlyWatching = (id, currentlyWatching) =>
    dispatch({ type: "currentlyWatching", id, currentlyWatching });

  const deleting = deleteId ? playlists.find((p) => p.id === deleteId) : null;

  // Group playlists: currently watching first, then others
  const watchingPlaylists = playlists.filter((p) => p.isCurrentlyWatching);
  const otherPlaylists = playlists.filter((p) => !p.isCurrentlyWatching);

  // Client-side sort for other playlists (watching ones stay pinned at top)
  const sortFn = (a, b) => {
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
      default:
        // Sort by last_viewed_at desc, nulls last, fallback to added_at
        const aTime = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
        const bTime = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
        if (aTime && bTime) return bTime - aTime;
        if (aTime) return -1;
        if (bTime) return 1;
        return (b.addedAt || "").localeCompare(a.addedAt || "");
    }
  };

  const sortedOther = [...otherPlaylists].sort(sortFn);
  const sortedWatching = [...watchingPlaylists].sort((a, b) => {
    // Sort watching by last_viewed_at desc
    const aTime = a.lastViewedAt ? new Date(a.lastViewedAt).getTime() : 0;
    const bTime = b.lastViewedAt ? new Date(b.lastViewedAt).getTime() : 0;
    if (aTime && bTime) return bTime - aTime;
    return (b.addedAt || "").localeCompare(a.addedAt || "");
  });

  const allSorted = [...sortedWatching, ...sortedOther];

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
        message={`“${deleting?.title || ""}” and all of its videos and progress will be permanently removed from your account. This cannot be undone.`}
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
            <div className="empty-icon" aria-hidden>
              ▦
            </div>
            <h2>No playlists yet</h2>
            <p>Paste any YouTube playlist link to start tracking it.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setModalOpen(true)}>
              + Add your first playlist
            </button>
          </div>
        ) : (
          <div className="playlist-grid">
            {allSorted.map((p, idx) => {
              const prog = core.progress[p.id] || { ids: [] };
              const markedSeconds = (core.data[p.id]?.videos || [])
                .filter((v) => prog.ids.includes(v.id))
                .reduce((s, v) => s + (v.duration || 0), 0);
              const pct =
                p.totalSeconds > 0
                  ? Math.round((markedSeconds / p.totalSeconds) * 100)
                  : 0;

              // Add divider between watching and not-watching groups
              const isFirstOther = !p.isCurrentlyWatching && idx === sortedWatching.length && sortedWatching.length > 0;

              return (
                <Fragment key={p.id}>
                  {isFirstOther && (
                    <hr className="section-divider" key={`divider-${p.id}`} />
                  )}
                  <div className="playlist-card">
                    <div className="playlist-card-top">
                      <Link href={`/playlists/${p.id}`} className="playlist-card-link">
                        <h3 className="playlist-card-title">{p.title}</h3>
                      </Link>
                      <div className="playlist-card-actions">
                          <button
                            className={`btn ${p.isCurrentlyWatching ? "btn-primary" : ""}`}
                            onClick={() => handleCurrentlyWatching(p.id, !p.isCurrentlyWatching)}
                            aria-label={p.isCurrentlyWatching ? "Unmark as currently watching" : "Mark as currently watching"}
                            title={p.isCurrentlyWatching ? "Currently watching" : "Mark as currently watching"}
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
                    <Link href={`/playlists/${p.id}`} className="btn btn-block">
                      Open →
                    </Link>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}