# Technical Documentation

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router) |
| UI | React 19, plain CSS (no UI library) |
| Extraction | yt-dlp via `child_process.spawn` (server-side) |
| Storage | `localStorage` (single core JSON) |
| Fonts | Press Start 2P + VT323 (self-hosted in `public/fonts`) |

## Request flow — adding a playlist

```
Browser (AddPlaylistModal)           Server (app/api/playlists/route.js)          yt-dlp
─────────────────────────            ─────────────────────────────────────          ──────
POST /api/playlists {url} ───────▶  validatePlaylistUrl()
                                    400 if invalid (no rate-limit slot used)
                                    checkRateLimit(ip) ──▶ 429 if throttled
                                    spawn yt-dlp --flat-playlist --dump-json ──▶ stdout NDJSON
◀── progress {fetched,total} ─────  enqueue per parsed line
◀── done {playlist, videos} ──────  recordFetch(ip) [only on success]
◀── error {message} ─────────────  on any failure (stream still HTTP 200)
```

The response is a **streaming NDJSON** (`application/x-ndjson`) so progress is live. Each
parsed line yields a `progress` message; the final line is `done` or `error`.

## localStorage schema

Single key: `tracktube:core`

```jsonc
{
  "playlists": {
    "PLC3y8-...": {
      "id": "PLC3y8-...",
      "title": "Next.js 15 Tutorial - Beginner to Advanced",
      "channel": "Codevolution",
      "url": "https://...",
      "addedAt": "2026-08-16T12:00:00.000Z",
      "totalVideos": 92,
      "totalSeconds": 25381
    }
  },
  "data": {
    "PLC3y8-...": {
      "playlist": { "...": "same as above" },
      "videos": [
        {
          "index": 1,
          "id": "b4ba60j_4o8",
          "title": "Next.js 15 Tutorial - 1 - Introduction",
          "duration": 256,
          "durationString": "4:16",
          "url": "https://www.youtube.com/watch?v=b4ba60j_4o8",
          "thumbnail": "https://i.ytimg.com/vi/b4ba60j_4o8/hqdefault.jpg"
        }
      ]
    }
  },
  "progress": {
    "PLC3y8-...": { "ids": ["b4ba60j_4o8"], "savedAt": "2026-08-16T12:05:00.000Z" }
  }
}
```

Other keys: `tracktube:theme` (theme id), rate-limit file at `os.tmpdir()/tracktube-rate-limit.json`.

## Server modules

| Module | Responsibility |
| --- | --- |
| `lib/playlist.js` | `validatePlaylistUrl`, `fetchPlaylist(url, onProgress)` — spawns yt-dlp, stream-parses NDJSON with `readline`, re-fetches any video missing a duration (batches of 25, `--no-playlist`), builds the final JSON |
| `lib/rateLimit.js` | File-persisted per-IP window (1/hour). `ENABLED = process.env.RATE_LIMITING === "true"` |
| `app/api/playlists/route.js` | POST handler: validate → rate-limit → stream yt-dlp progress → done/error |

## Client modules

| Module | Responsibility |
| --- | --- |
| `lib/useCore.js` | `useCore()` hook: reducer over the core JSON + **write-through dispatch** (persists synchronously on every action — prevents navigation races) |
| `lib/storage.js` | Pure functions over the core JSON (add/delete playlist, toggle/set/clear progress) |
| `lib/format.js` | `formatDuration`, `humanize`, `timeLeftIn` |
| `lib/themes.js` | 10 theme definitions, load/save theme id |
| `components/NavBar.jsx` | Brand, theme picker, add-playlist button |
| `components/ThemePicker.jsx` | Theme dropdown, applies `data-theme` on `<html>` |
| `components/AddPlaylistModal.jsx` | URL form, streamed progress bar, error/rate-limit states |
| `components/ConfirmModal.jsx` | Reusable confirmation popup (Escape/Enter keys) |
| `components/Sidebar.jsx` | Analytics panel (donut, stats, longest, filters, actions) |
| `components/VideoList.jsx` | Video cards list |
| `components/analytics/Donut.jsx` | SVG donut (uses CSS vars via inline styles for Safari safety) |
| `components/analytics/MiniBar.jsx` | Horizontal duration bar |

## Routes

| Route | Type | Purpose |
| --- | --- | --- |
| `/` | static | Dashboard |
| `/playlists/[id]` | dynamic | Per-playlist tracker |
| `/api/playlists` | POST, dynamic | Fetch playlist (streaming) |

## Theme system

- CSS custom properties on `[data-theme="..."]` selectors; 10 variants in `app/globals.css`.
- `app/layout.jsx` ships an inline pre-paint script that sets `data-theme` from localStorage (with `suppressHydrationWarning` on `<html>`).
- Themes: crt-green, sunset, ocean, blood, forest, purple-haze, mono, candy, ember, night-blue.

## Known limitations

- `localStorage` quota (~5 MB) caps the number of large playlists (~125 × 40 KB).
- Rate limit is per IP as seen by the server; behind a proxy, set `X-Forwarded-For` correctly.
- yt-dlp must be installed on the host.