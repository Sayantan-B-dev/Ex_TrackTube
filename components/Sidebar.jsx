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

  const durations = videos.map((v) => v.duration || 0).sort((a, b) => a - b);
  const avgSeconds = videos.length ? totalSeconds / videos.length : 0;
  const medianSeconds = durations.length
    ? durations[Math.floor((durations.length - 1) / 2)]
    : 0;
  const shortestSeconds = durations[0] || 0;
  const longestSeconds = durations[durations.length - 1] || 0;

  const finishPace = (hoursPerDay) => {
    const days = remainingSeconds / (hoursPerDay * 3600);
    if (remainingSeconds <= 0) return "Completed";
    if (days >= 1) return `${Math.ceil(days)} days`;
    return `${Math.max(1, Math.round(days * 24))} h`;
  };
  const finishEta = (hoursPerDay) => {
    if (remainingSeconds <= 0) return "all caught up";
    const days = remainingSeconds / (hoursPerDay * 3600);
    const eta = new Date(Date.now() + days * 86400000);
    return `≈ by ${eta.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    })}`;
  };

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
        <h2 className="side-section-title">Playback speed</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Total @ 1.5×</span>
            <span className="stat-value">{formatDuration(totalSeconds / 1.5)}</span>
            <span className="stat-hint">{humanize(totalSeconds / 1.5)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total @ 2×</span>
            <span className="stat-value">{formatDuration(totalSeconds / 2)}</span>
            <span className="stat-hint">{humanize(totalSeconds / 2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Remaining @ 1.5×</span>
            <span className="stat-value" style={{ color: "var(--success)" }}>
              {formatDuration(remainingSeconds / 1.5)}
            </span>
            <span className="stat-hint">{humanize(remainingSeconds / 1.5)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Remaining @ 2×</span>
            <span className="stat-value" style={{ color: "var(--success)" }}>
              {formatDuration(remainingSeconds / 2)}
            </span>
            <span className="stat-hint">{humanize(remainingSeconds / 2)}</span>
          </div>
        </div>
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Video breakdown</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">Average length</span>
            <span className="stat-value">{formatDuration(avgSeconds)}</span>
            <span className="stat-hint">{humanize(avgSeconds)} per video</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Median length</span>
            <span className="stat-value">{formatDuration(medianSeconds)}</span>
            <span className="stat-hint">{humanize(medianSeconds)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Shortest</span>
            <span className="stat-value">{formatDuration(shortestSeconds)}</span>
            <span className="stat-hint">{humanize(shortestSeconds)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Longest</span>
            <span className="stat-value">{formatDuration(longestSeconds)}</span>
            <span className="stat-hint">{humanize(longestSeconds)}</span>
          </div>
        </div>
      </section>

      <section className="side-section">
        <h2 className="side-section-title">Time to finish</h2>
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-label">@ 1 h / day</span>
            <span className="stat-value">{finishPace(1)}</span>
            <span className="stat-hint">{finishEta(1)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">@ 2 h / day</span>
            <span className="stat-value">{finishPace(2)}</span>
            <span className="stat-hint">{finishEta(2)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">@ 3 h / day</span>
            <span className="stat-value">{finishPace(3)}</span>
            <span className="stat-hint">{finishEta(3)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">@ 4 h / day</span>
            <span className="stat-value">{finishPace(4)}</span>
            <span className="stat-hint">{finishEta(4)}</span>
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