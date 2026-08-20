export default function SyncIndicator({ busy }) {
  if (!busy) return null;
  return (
    <div className="sync-indicator" role="status" aria-live="polite">
      <div className="spinner spinner-sm" aria-hidden />
      <span className="sync-indicator-text">SYNCING…</span>
    </div>
  );
}