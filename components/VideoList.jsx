import { useState } from "react";
import { formatDuration } from "../lib/format";

export default function VideoList({ videos, markedIds, markedSeconds, onToggle }) {
  const marked = new Set(markedIds);
  const [playing, setPlaying] = useState(null);
  return (
    <>
      <ul className="video-list">
      {videos.map((v) => {
        const isMarked = marked.has(v.id);
        return (
          <li key={v.uuid || `${v.id}-${v.index}`}>
            <button
              onClick={() => onToggle(v.id)}
              className={`video-card${isMarked ? " video-card-marked" : ""}`}
              aria-pressed={isMarked}
            >
              <span className={`video-check${isMarked ? " video-check-on" : ""}`}>
                {isMarked ? "✓" : ""}
              </span>
              <div className="video-thumb-wrap" onClick={(e) => { e.stopPropagation(); setPlaying(v.id); }}>
                <img
                  src={v.thumbnail}
                  alt=""
                  loading="lazy"
                  width={160}
                  height={90}
                  className="video-thumb"
                />
                <span className="video-play" aria-hidden>▶</span>
              </div>
              <span className="video-body">
                <span className="video-title">
                  <span className="video-index">
                    {String(v.index).padStart(2, "0")}.
                  </span>{" "}
                  {v.title}
                </span>
                <span className="video-meta">
                  <span className="video-dur">{v.durationString}</span>
                  {isMarked
                    ? `included in marked total (${formatDuration(markedSeconds)})`
                    : `adds ${v.durationString} if marked`}
                </span>
              </span>
              <span className="video-status">{isMarked ? "Marked" : "Mark"}</span>
            </button>
          </li>
        );
      })}
    </ul>
      {playing && (
        <div className="video-modal" onClick={() => setPlaying(null)}>
          <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="video-modal-close" onClick={() => setPlaying(null)} aria-label="Close">✕</button>
            <div className="video-iframe-wrap">
              <iframe
                src={`https://www.youtube.com/embed/${playing}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}