import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const BIN_DIR = path.join(
  process.cwd(),
  "node_modules",
  "youtube-dl-exec",
  "bin"
);
const BIN_FILE = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
const BUNDLED_PATH = path.join(BIN_DIR, BIN_FILE);

let cachedPath = null;

async function downloadYtDlp() {
  const releaseRes = await fetch(
    "https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest",
    { headers: { "User-Agent": "tracktube", Accept: "application/vnd.github+json" } }
  );
  if (!releaseRes.ok) throw new Error("Could not resolve yt-dlp release");
  const release = await releaseRes.json();
  const asset = (release.assets || []).find((a) => a.name === BIN_FILE);
  if (!asset) throw new Error("yt-dlp asset not found");
  const binRes = await fetch(asset.browser_download_url);
  if (!binRes.ok) throw new Error("Could not download yt-dlp binary");
  const bytes = Buffer.from(await binRes.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), BIN_FILE);
  await writeFile(tmpPath, bytes);
  if (process.platform !== "win32") await chmod(tmpPath, 0o755);
  return tmpPath;
}

async function resolveYtDlpPath() {
  if (cachedPath) return cachedPath;
  if (existsSync(BUNDLED_PATH)) return (cachedPath = BUNDLED_PATH);
  try {
    const { constants } = require("youtube-dl-exec");
    if (existsSync(constants.YOUTUBE_DL_PATH)) {
      return (cachedPath = constants.YOUTUBE_DL_PATH);
    }
  } catch {
    /* bundled binary unavailable */
  }
  try {
    return (cachedPath = await downloadYtDlp());
  } catch {
    return "yt-dlp";
  }
}

export function validatePlaylistUrl(raw) {
  try {
    const u = new URL(raw);
    return (
      (u.hostname === "www.youtube.com" || u.hostname === "youtube.com" || u.hostname === "youtu.be") &&
      (u.searchParams.has("list") || u.hostname === "youtu.be" || u.pathname.startsWith("/playlist"))
    );
  } catch {
    return false;
  }
}

function parseLine(line, metaRef, videosRef, onProgress) {
  if (!line.trim()) return;
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    return;
  }
  if (!entry.id) return;

  if (!metaRef.current && entry.playlist_id) {
    metaRef.current = {
      id: entry.playlist_id,
      title: entry.playlist_title || entry.playlist || "Untitled playlist",
      channel: entry.playlist_uploader || entry.playlist_channel || "Unknown channel",
      url: entry.playlist_webpage_url || "",
      totalVideos: entry.playlist_count || entry.n_entries || 0,
    };
  }

  const duration = Number.isFinite(entry.duration) ? Math.floor(entry.duration) : null;
  videosRef.current.push({
    index: entry.playlist_index || videosRef.current.length + 1,
    id: entry.id,
    title: entry.title || `Video ${entry.id}`,
    duration,
    durationString: entry.duration_string || (duration != null ? secondsToClock(duration) : "—"),
    url: entry.webpage_url || `https://www.youtube.com/watch?v=${entry.id}`,
    thumbnail: `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`,
  });

  if (onProgress) {
    const total = metaRef.current?.totalVideos || entry.n_entries;
    onProgress({ fetched: videosRef.current.length, total: total || videosRef.current.length });
  }
}

function secondsToClock(s) {
  const hrs = Math.floor(s / 3600);
  const min = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(min)}:${pad(sec)}` : `${min}:${pad(sec)}`;
}

function run(args) {
  return new Promise((resolve, reject) => {
    resolveYtDlpPath()
      .then((binary) => {
        const child = spawn(binary, args, {
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
        let stdout = "";
        let stderr = "";
        child.stdout.setEncoding("utf8");
        child.stderr.setEncoding("utf8");
        child.stdout.on("data", (d) => (stdout += d));
        child.stderr.on("data", (d) => (stderr += d));
        child.on("error", (err) =>
          reject(
            new Error(
              err.code === "ENOENT"
                ? "yt-dlp is not available in this environment. Install it on the host or deploy somewhere that bundles it."
                : err.message
            )
          )
        );
        child.on("close", (code) => {
          if (code === 0) resolve({ stdout, stderr });
          else reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        });
      })
      .catch(reject);
  });
}

async function fetchMissingDurations(videos) {
  const missing = videos.filter((v) => v.duration == null);
  if (missing.length === 0) return;
  const chunkSize = 25;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    try {
      const { stdout } = await run([
        "--no-playlist",
        "--dump-json",
        "--no-warnings",
        "--simulate",
        ...chunk.map((v) => v.url),
      ]);
      const byId = new Map();
      for (const line of stdout.split("\n")) {
        if (!line.trim()) continue;
        try {
          const e = JSON.parse(line);
          if (e.id && Number.isFinite(e.duration)) {
            byId.set(e.id, { duration: Math.floor(e.duration), durationString: e.duration_string });
          }
        } catch {
          /* skip */
        }
      }
      for (const v of chunk) {
        const info = byId.get(v.id);
        if (info) {
          v.duration = info.duration;
          v.durationString = info.durationString;
        }
      }
    } catch {
      /* leave as null */
    }
  }
}

export async function fetchPlaylist(rawUrl, onProgress) {
  if (!validatePlaylistUrl(rawUrl)) {
    throw new Error("Please enter a valid YouTube playlist link (e.g. https://www.youtube.com/playlist?list=...)");
  }

  const metaRef = { current: null };
  const videosRef = { current: [] };

  const binary = await resolveYtDlpPath();
  const child = spawn(
    binary,
    ["--flat-playlist", "--dump-json", "--no-warnings", "--no-call-home", rawUrl],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
  );
  child.stderr.setEncoding("utf8");
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  child.on("error", (err) => {
    stderr = err.code === "ENOENT"
      ? "yt-dlp is not available in this environment. Install it on the host or deploy somewhere that bundles it."
      : err.message;
  });

  const rl = createInterface({ input: child.stdout });
  for await (const line of rl) {
    parseLine(line, metaRef, videosRef, onProgress);
  }

  const [close] = await once(child, "close");

  if (!metaRef.current && videosRef.current.length === 0) {
    if (!stderr.trim()) {
      throw new Error("The playlist is empty, private, or could not be read.");
    }
    throw new Error(`Could not fetch the playlist: ${stderr.trim().split("\n")[0]}`);
  }
  if (close !== 0 && videosRef.current.length === 0) {
    throw new Error(`yt-dlp failed: ${stderr.trim().split("\n")[0] || "unknown error"}`);
  }

  await fetchMissingDurations(videosRef.current);

  const totalSeconds = videosRef.current.reduce((s, v) => s + (v.duration || 0), 0);
  videosRef.current.sort((a, b) => (a.index || 0) - (b.index || 0));

  return {
    playlist: {
      ...metaRef.current,
      totalVideos: videosRef.current.length,
      totalSeconds,
    },
    videos: videosRef.current,
  };
}