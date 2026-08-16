"use client";

import { useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";
import AddPlaylistModal from "../components/AddPlaylistModal";
import { useCore } from "../lib/useCore";
import { formatDuration, humanize } from "../lib/format";

export default function Home() {
  const { core, dispatch, playlists } = useCore();
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = (playlist, videos) => {
    dispatch({ type: "add", playlist, videos });
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this playlist and its progress?")) return;
    dispatch({ type: "delete", id });
  };

  return (
    <div className="page">
      <NavBar onAddPlaylist={() => setModalOpen(true)} />
      <AddPlaylistModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAdd}
      />

      <main className="container">
        <div className="page-head">
          <h1>Your playlists</h1>
          <p>
            Track your progress across any YouTube playlist. Everything stays in
            your browser.
          </p>
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
            {playlists.map((p) => {
              const prog = core.progress[p.id] || { ids: [] };
              const markedSeconds = (core.data[p.id]?.videos || [])
                .filter((v) => prog.ids.includes(v.id))
                .reduce((s, v) => s + (v.duration || 0), 0);
              const pct =
                p.totalSeconds > 0
                  ? Math.round((markedSeconds / p.totalSeconds) * 100)
                  : 0;
              return (
                <div className="playlist-card" key={p.id}>
                  <div className="playlist-card-top">
                    <Link href={`/playlists/${p.id}`} className="playlist-card-link">
                      <h3 className="playlist-card-title">{p.title}</h3>
                    </Link>
                    <button
                      className="btn btn-icon btn-danger"
                      onClick={() => handleDelete(p.id)}
                      aria-label="Delete playlist"
                      title="Delete playlist"
                    >
                      ✕
                    </button>
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}