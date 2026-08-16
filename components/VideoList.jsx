import { formatDuration } from "../lib/format";

export default function VideoList({ videos, markedIds, markedSeconds, onToggle }) {
  const marked = new Set(markedIds);
  return (
    <ul className="video-list">
      {videos.map((v) => {
        const isMarked = marked.has(v.id);
        return (
          <li key={v.id}>
            <button
              onClick={() => onToggle(v.id)}
              className={`video-card${isMarked ? " video-card-marked" : ""}`}
              aria-pressed={isMarked}
            >
              <span className={`video-check${isMarked ? " video-check-on" : ""}`}>
                {isMarked ? "✓" : ""}
              </span>
              <img
                src={v.thumbnail}
                alt=""
                loading="lazy"
                width={160}
                height={90}
                className="video-thumb"
              />
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
  );
}