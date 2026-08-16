export default function Donut({ pct, markedSeconds, totalSeconds }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const filled = (c * Math.min(pct, 100)) / 100;
  return (
    <div className="donut-wrap">
      <svg width={170} height={170} viewBox="0 0 170 170">
        <circle cx={85} cy={85} r={r} fill="none" stroke="var(--border)" strokeWidth={14} />
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
      <div className="donut-center">
        <div className="donut-pct">{Math.round(pct)}%</div>
        <div className="donut-sub">
          {markedSeconds > 0 ? `${Math.floor(markedSeconds / 3600)}h ${Math.round((markedSeconds % 3600) / 60)}m` : "0h"}
          <br />of {totalSeconds > 0 ? `${Math.floor(totalSeconds / 3600)}h ${Math.round((totalSeconds % 3600) / 60)}m` : "—"}
        </div>
      </div>
    </div>
  );
}