"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "playlist-tracker-state";

function formatDuration(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hrs > 0) return `${hrs}:${pad(min)}:${pad(sec)}`;
  return `${min}:${pad(sec)}`;
}

function humanize(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const min = Math.round((totalSeconds % 3600) / 60);
  if (hrs > 0 && min > 0) return `${hrs} hr ${min} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${min} min`;
}

function Donut({ pct, selectedSeconds, totalSeconds }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const filled = c * Math.min(pct, 100) / 100;
  return (
    <div style={styles.donutWrap}>
      <svg width={170} height={170} viewBox="0 0 170 170">
        <circle
          cx={85}
          cy={85}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={14}
        />
        <circle
          cx={85}
          cy={85}
          r={r}
          fill="none"
          stroke={pct >= 100 ? "var(--success)" : "var(--accent)"}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
          transform="rotate(-90 85 85)"
          style={{ transition: "stroke-dasharray .3s ease, stroke .3s ease" }}
        />
      </svg>
      <div style={styles.donutCenter}>
        <div style={styles.donutPct}>{Math.round(pct)}%</div>
        <div style={styles.donutSub}>
          {formatDuration(selectedSeconds)}
          <br />
          of {formatDuration(totalSeconds)}
        </div>
      </div>
    </div>
  );
}

function MiniBar({ label, seconds, maxSeconds }) {
  const w = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;
  return (
    <div style={styles.miniBarRow}>
      <span style={styles.miniBarLabel} title={label}>
        {label}
      </span>
      <div style={styles.miniBarTrack}>
        <div style={{ ...styles.miniBarFill, width: `${w}%` }} />
      </div>
      <span style={styles.miniBarTime}>{formatDuration(seconds)}</span>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [filterTab, setFilterTab] = useState("all");
  const [search, setSearch] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  useEffect(() => {
    fetch("/data.json")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    if (!data) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.ids)) {
          const valid = new Set(
            parsed.ids.filter((id) => data.videos.some((v) => v.id === id))
          );
          setSelected(valid);
          setSavedAt(parsed.savedAt ?? null);
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoadedFromStorage(true);
  }, [data]);

  useEffect(() => {
    if (!data || !loadedFromStorage) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ids: [...selected],
        savedAt: new Date().toISOString(),
      })
    );
  }, [selected, data, loadedFromStorage]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stats = useMemo(() => {
    if (!data) return null;
    const totalSeconds = data.videos.reduce((s, v) => s + v.duration, 0);
    const selectedSeconds = data.videos
      .filter((v) => selected.has(v.id))
      .reduce((s, v) => s + v.duration, 0);
    const remainingSeconds = totalSeconds - selectedSeconds;
    const pct = totalSeconds > 0 ? (selectedSeconds / totalSeconds) * 100 : 0;
    const sorted = [...data.videos].sort((a, b) => b.duration - a.duration);
    return { totalSeconds, selectedSeconds, remainingSeconds, pct, sorted };
  }, [data, selected]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.videos.filter((v) => {
      if (filterTab === "selected" && !selected.has(v.id)) return false;
      if (filterTab === "unmarked" && selected.has(v.id)) return false;
      if (q && !v.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, filterTab, selected]);

  if (!data || !stats) {
    return (
      <div style={styles.center}>
        <p>Loading playlist...</p>
      </div>
    );
  }

  const tabs = [
    { key: "all", label: "All" },
    { key: "selected", label: "Selected" },
    { key: "unmarked", label: "Not marked" },
  ];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div style={styles.sideHead}>
          <h1 style={styles.title}>{data.playlist}</h1>
          <p style={styles.subtitle}>
            {data.channel} · {data.totalVideos} videos
          </p>
          <a
            href={data.playlistUrl}
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Open on YouTube ↗
          </a>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Analytics</h2>
          <Donut
            pct={stats.pct}
            selectedSeconds={stats.selectedSeconds}
            totalSeconds={stats.totalSeconds}
          />
          <div style={styles.legend}>
            <div style={styles.legendRow}>
              <span style={{ ...styles.legendDot, background: "var(--accent)" }} />
              <span style={styles.legendLabel}>Marked</span>
              <span style={styles.legendValue}>
                {selected.size} · {formatDuration(stats.selectedSeconds)}
              </span>
            </div>
            <div style={styles.legendRow}>
              <span style={{ ...styles.legendDot, background: "var(--border)" }} />
              <span style={styles.legendLabel}>Unmarked</span>
              <span style={styles.legendValue}>
                {data.totalVideos - selected.size} ·{" "}
                {formatDuration(stats.remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Stats</h2>
          <div style={styles.statGrid}>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Total</span>
              <span style={styles.statValue}>{formatDuration(stats.totalSeconds)}</span>
              <span style={styles.statHint}>{humanize(stats.totalSeconds)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Marked</span>
              <span style={styles.statValue}>{formatDuration(stats.selectedSeconds)}</span>
              <span style={styles.statHint}>{selected.size} videos</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Time left</span>
              <span style={{ ...styles.statValue, color: "var(--success)" }}>
                {formatDuration(stats.remainingSeconds)}
              </span>
              <span style={styles.statHint}>{humanize(stats.remainingSeconds)}</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statLabel}>Progress</span>
              <span style={styles.statValue}>{Math.round(stats.pct)}%</span>
              <span style={styles.statHint}>
                {stats.pct >= 100 ? "Completed" : `${(100 - stats.pct).toFixed(1)}% remaining`}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Longest videos</h2>
          {stats.sorted.slice(0, 5).map((v) => (
            <MiniBar
              key={v.id}
              label={v.title}
              seconds={v.duration}
              maxSeconds={stats.sorted[0].duration}
            />
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Filters</h2>
          <input
            style={styles.search}
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={styles.tabs}>
            {tabs.map((t) => {
              const count =
                t.key === "all"
                  ? data.totalVideos
                  : t.key === "selected"
                  ? selected.size
                  : data.totalVideos - selected.size;
              const active = filterTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setFilterTab(t.key)}
                  style={{ ...styles.tab, ...(active && styles.tabActive) }}
                >
                  {t.label}
                  <span style={styles.tabCount}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Actions</h2>
          <div style={styles.actions}>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => setSelected(new Set(data.videos.map((v) => v.id)))}
            >
              Mark all
            </button>
            <button
              style={styles.btn}
              onClick={() => setSelected(new Set())}
            >
              Clear all
            </button>
            <button
              style={styles.btn}
              onClick={() => {
                setSelected(new Set());
                setSavedAt(null);
                localStorage.removeItem(STORAGE_KEY);
              }}
            >
              Reset progress
            </button>
          </div>
        </div>

        <div style={styles.saveNote}>
          {savedAt
            ? `Progress auto-saved · last change ${new Date(savedAt).toLocaleTimeString()}`
            : "Progress is saved automatically to localStorage"}
        </div>
      </aside>

      <main className="main">
        <div style={styles.mainBar}>
          <span style={styles.mainBarTitle}>
            {filterTab === "all" && "All videos"}
            {filterTab === "selected" && "Selected videos"}
            {filterTab === "unmarked" && "Not marked"}
            {search && ` · “${search}”`}
          </span>
          <span style={styles.mainBarInfo}>
            {filtered.length} shown ·{" "}
            <strong>{formatDuration(stats.selectedSeconds)}</strong> marked ·{" "}
            <strong style={{ color: "var(--success)" }}>
              {formatDuration(stats.remainingSeconds)}
            </strong>{" "}
            left
          </span>
        </div>

        <ul style={styles.list}>
          {filtered.map((v) => {
            const isSel = selected.has(v.id);
            return (
              <li key={v.id}>
                <button
                  onClick={() => toggle(v.id)}
                  style={{
                    ...styles.card,
                    borderColor: isSel ? "var(--selected)" : "var(--border)",
                    background: isSel ? "#16233d" : "var(--panel)",
                  }}
                  aria-pressed={isSel}
                >
                  <span
                    style={{
                      ...styles.check,
                      background: isSel ? "var(--selected)" : "var(--bg)",
                      borderColor: isSel ? "var(--selected)" : "var(--border)",
                    }}
                  >
                    {isSel ? "✓" : ""}
                  </span>
                  <img
                    src={v.thumbnail}
                    alt=""
                    loading="lazy"
                    width={160}
                    height={90}
                    style={styles.thumb}
                  />
                  <span style={styles.cardBody}>
                    <span style={styles.cardTitle}>
                      <span style={styles.cardIndex}>
                        {v.index.toString().padStart(2, "0")}.
                      </span>{" "}
                      {v.title}
                    </span>
                    <span style={styles.cardMeta}>
                      <span style={styles.durBadge}>{v.durationString}</span>
                      {isSel
                        ? `included in marked total (${formatDuration(stats.selectedSeconds)})`
                        : `adds ${v.durationString} if marked`}
                    </span>
                  </span>
                  <span style={styles.cardStatus}>
                    {isSel ? "Marked" : "Mark"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {filtered.length === 0 && (
          <p style={styles.empty}>No videos match this view.</p>
        )}
      </main>
    </div>
  );
}

const styles = {
  center: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sideHead: { marginBottom: 8 },
  title: { fontSize: 19, lineHeight: 1.25, marginBottom: 4 },
  subtitle: { color: "var(--muted)", fontSize: 13 },
  link: {
    display: "inline-block",
    marginTop: 8,
    color: "#93c5fd",
    fontSize: 13,
    textDecoration: "none",
  },
  section: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: "1px solid var(--border)",
  },
  sectionTitle: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    marginBottom: 12,
  },
  donutWrap: { position: "relative", width: 170, margin: "0 auto 10px" },
  donutCenter: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  donutPct: { fontSize: 26, fontWeight: 700 },
  donutSub: { fontSize: 11, color: "var(--muted)", lineHeight: 1.5 },
  legend: { display: "flex", flexDirection: "column", gap: 6 },
  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    flexShrink: 0,
  },
  legendLabel: { color: "var(--muted)", flex: 1 },
  legendValue: { fontWeight: 600, fontSize: 12 },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  statCard: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  statLabel: { fontSize: 11, color: "var(--muted)" },
  statValue: { fontSize: 16, fontWeight: 700 },
  statHint: { fontSize: 11, color: "var(--muted)" },
  miniBarRow: {
    display: "grid",
    gridTemplateColumns: "1fr 60px 44px",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    fontSize: 12,
  },
  miniBarLabel: {
    color: "var(--muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miniBarTrack: {
    height: 6,
    background: "var(--bg)",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: "100%",
    background: "var(--accent)",
    borderRadius: 3,
  },
  miniBarTime: { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  search: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 14,
    outline: "none",
    marginBottom: 10,
  },
  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 6,
  },
  tab: {
    padding: "8px 6px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "transparent",
    color: "var(--text)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  tabActive: {
    borderColor: "var(--selected)",
    background: "#16233d",
    color: "#93c5fd",
  },
  tabCount: { fontSize: 11, color: "var(--muted)" },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  btn: {
    padding: "9px 14px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  btnPrimary: {
    background: "var(--accent)",
    borderColor: "var(--accent)",
    color: "#fff",
  },
  saveNote: {
    marginTop: 22,
    paddingTop: 14,
    borderTop: "1px solid var(--border)",
    fontSize: 11,
    color: "var(--muted)",
    textAlign: "center",
  },
  mainBar: {
    position: "sticky",
    top: -20,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    background: "rgba(15,17,21,.92)",
    backdropFilter: "blur(6px)",
    padding: "12px 0",
    marginBottom: 14,
    borderBottom: "1px solid var(--border)",
    fontSize: 13,
  },
  mainBarTitle: { fontWeight: 700, fontSize: 14 },
  mainBarInfo: { color: "var(--muted)" },
  list: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    textAlign: "left",
    borderWidth: 1,
    borderStyle: "solid",
    borderRadius: 12,
    padding: 10,
    color: "var(--text)",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "border-color .15s, background .15s",
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderStyle: "solid",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: "#fff",
    fontSize: 14,
    transition: "background .15s, border-color .15s",
  },
  thumb: {
    borderRadius: 8,
    flexShrink: 0,
    objectFit: "cover",
    width: 160,
    height: 90,
  },
  cardBody: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 0,
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 500,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardIndex: { color: "var(--muted)", fontSize: 12 },
  cardMeta: {
    color: "var(--muted)",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  durBadge: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    padding: "2px 8px",
    fontSize: 11,
    fontVariantNumeric: "tabular-nums",
  },
  cardStatus: {
    flexShrink: 0,
    fontSize: 12,
    color: "#93c5fd",
    fontWeight: 600,
  },
  empty: {
    textAlign: "center",
    color: "var(--muted)",
    padding: "60px 0",
  },
};