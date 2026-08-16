import os from "node:os";
import path from "node:path";
import fs from "node:fs";

const WINDOW_MS = 60 * 60 * 1000;
const FILE = path.join(os.tmpdir(), "tracktube-rate-limit.json");
const ENABLED = process.env.RATE_LIMITING === "true";

let cache = null;

function load() {
  if (cache) return;
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    const now = Date.now();
    cache = Object.fromEntries(
      Object.entries(parsed).filter(([, ts]) => now - ts < WINDOW_MS)
    );
  } catch {
    cache = {};
  }
}

function save() {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(cache));
  } catch {
    /* ignore persistence failures */
  }
}

export function checkRateLimit(ip) {
  if (!ENABLED) return { allowed: true };
  load();
  const now = Date.now();
  const last = cache[ip] ?? 0;
  const elapsed = now - last;
  if (elapsed < WINDOW_MS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - elapsed };
  }
  return { allowed: true };
}

export function recordFetch(ip) {
  if (!ENABLED) return;
  load();
  cache[ip] = Date.now();
  save();
}