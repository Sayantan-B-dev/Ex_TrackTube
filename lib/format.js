export function formatDuration(totalSeconds) {
  const secs = Math.round(totalSeconds);
  const hrs = Math.floor(secs / 3600);
  const min = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;
  const pad = (n) => String(n).padStart(2, "0");
  if (hrs > 0) return `${hrs}:${pad(min)}:${pad(sec)}`;
  return `${min}:${pad(sec)}`;
}

export function humanize(totalSeconds) {
  const secs = Math.round(totalSeconds);
  const hrs = Math.floor(secs / 3600);
  const min = Math.round((secs % 3600) / 60);
  if (hrs > 0 && min > 0) return `${hrs} hr ${min} min`;
  if (hrs > 0) return `${hrs} hr`;
  return `${min} min`;
}

export function timeLeftIn(ms) {
  const min = Math.ceil(ms / 60000);
  if (min < 60) return `${min} min`;
  const hrs = Math.floor(min / 60);
  const rest = min % 60;
  return rest > 0 ? `${hrs} hr ${rest} min` : `${hrs} hr`;
}