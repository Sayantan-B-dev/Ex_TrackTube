"use client";

import Link from "next/link";
import Donut from "./analytics/Donut";
import MiniBar from "./analytics/MiniBar";
import { formatDuration, humanize } from "../lib/format";

export default function Sidebar({
  playlist,
  videos,
  markedCount,
  markedSeconds,
  totalSeconds,
  search,
  setSearch,
  filterTab,
  setFilterTab,
  onMarkAll,
  onClearAll,
  onResetProgress,
  savedAt,
}) {
  const remainingSeconds = totalSeconds - markedSeconds;
  const pct = totalSeconds > 0 ? (markedSeconds / totalSeconds) * 100 : 0;
  const sorted = [...videos].sort((a, b) => b.duration - a.duration);

  const tabs = [
    { key: "all", label: "All" },
    { key: "selected", label: "Marked" },
    { key: "unmarked", label: "Not marked" },
  ];

  return (
    <aside className="sidebar">
      <Link href="/playlists" className="back-link">
        ← All playlists
      </Link>
      <h1 className="sidebar-title">{playlist.title}</h1>
      <p className="sidebar-subtitle">
        {playlist.channel} · {playlist.totalVideos} videos
      </p>
      <a href={playlist.url} target="_blank" rel="noreferrer" className="external-link">
        Open on YouTube ↗
      </a>

      <section className="side-section">
        <h2 className="side-section-title">Analytics</h2>
        <Donut pct={pct} markedSeconds={markedSeconds} totalSeconds={totalSeconds} />
        <div className="legend">
          <div className="legend-row">
            <span className="legend-dot" style={{ background: "var(--accent)" }} />
            <span className="legend-label">Marked</span>
            <span className="legend-value">
              {markedCount} · {formatDuration(markedSeconds)}
            </span>
          </div>
          <div className="legend-row">
            <span className="legend-dot" style={{ background: "var(--border)" }} />
            <span className="legend-label">Unmarked</span>
            <span className="legend-value">
              {videos.length - markedCount} · {formatDuration(remainingSeconds)}
            </span>
          </div>
        </div>
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Stats</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{formatDuration(totalSeconds)}</span>
            <span className="stat-hint">{humanize(totalSeconds)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Marked</span>
            <span className="stat-value">{formatDuration(markedSeconds)}</span>
            <span className="stat-hint">{markedCount} videos</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Time left</span>
            <span className="stat-value" style={{ color: "var(--success)" }}>
              {formatDuration(remainingSeconds)}
            </span>
            <span className="stat-hint">{humanize(remainingSeconds)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Progress</span>
            <span className="stat-value">{Math.round(pct)}%</span>
            <span className="stat-hint">
              {pct >= 100 ? "Completed" : `${(100 - pct).toFixed(1)}% remaining`}
            </span>
          </div>
        </div>
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Longest videos</h2>
        {sorted.slice(0, 5).map((v) => (
          <MiniBar key={v.uuid || `${v.id}-${v.index}`} label={v.title} seconds={v.duration} maxSeconds={sorted[0]?.duration} />
        ))}
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Filters</h2>
        <input
          className="input"
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="tabs">
          {tabs.map((t) => {
            const count =
              t.key === "all"
                ? videos.length
                : t.key === "selected"
                  ? markedCount
                  : videos.length - markedCount;
            const active = filterTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key)}
                className={`tab${active ? " tab-active" : ""}`}
              >
                {t.label}
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Actions</h2>
        <div className="action-stack">
          <button className="btn btn-primary" onClick={onMarkAll}>
            Mark all
          </button>
          <button className="btn" onClick={onClearAll}>
            Clear all
          </button>
          <button className="btn" onClick={onResetProgress}>
            Reset progress
          </button>
        </div>
      </section>

      <div className="save-note">
        {savedAt
          ? `Progress auto-saved · last change ${new Date(savedAt).toLocaleTimeString()}`
          : "Progress saves to your account automatically"}
      </div>
    </aside>
  );
}