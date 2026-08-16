import { formatDuration } from "../../lib/format";

export default function MiniBar({ label, seconds, maxSeconds }) {
  const w = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;
  return (
    <div className="minibar-row">
      <span className="minibar-label" title={label}>
        {label}
      </span>
      <div className="minibar-track">
        <div className="minibar-fill" style={{ width: `${w}%` }} />
      </div>
      <span className="minibar-time">{formatDuration(seconds)}</span>
    </div>
  );
}