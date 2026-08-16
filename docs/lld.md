# Low-Level Design (LLD)

## Module map

```
nextjsread/
├── app/
│   ├── layout.jsx                  Root layout: CSS import, theme init script, suppressHydrationWarning
│   ├── page.jsx                    Dashboard (client): playlist cards, add/delete modals
│   ├── globals.css                 All styles + 10 theme variable sets + media queries
│   ├── api/
│   │   └── playlists/
│   │       └── route.js            POST handler (streaming NDJSON)
│   └── playlists/
│       └── [id]/
│           └── page.jsx            Playlist tracker page (client)
├── components/
│   ├── NavBar.jsx
│   ├── ThemePicker.jsx
│   ├── AddPlaylistModal.jsx
│   ├── ConfirmModal.jsx
│   ├── Sidebar.jsx
│   ├── VideoList.jsx
│   └── analytics/
│       ├── Donut.jsx
│       └── MiniBar.jsx
├── lib/
│   ├── playlist.js                 Server: yt-dlp orchestration
│   ├── rateLimit.js                Server: file-persisted per-IP window
│   ├── storage.js                  Client: pure core-JSON operations
│   ├── useCore.js                  Client: reducer hook + write-through persistence
│   ├── format.js                   Time formatting helpers
│   └── themes.js                   10 theme definitions + persistence
├── public/
│   └── fonts/                      press-start-2p.woff2, vt323.woff2
└── .env.example                    RATE_LIMITING=true|false
```

## Key functions

### `lib/playlist.js` (server)

| Function | Signature | Behavior |
| --- | --- | --- |
| `validatePlaylistUrl(raw)` | `string → boolean` | Accepts `youtube.com` / `youtu.be` hosts with a `list` param or `/playlist` path |
| `fetchPlaylist(rawUrl, onProgress)` | `(string, fn) → Promise<{playlist, videos}>` | Spawns `yt-dlp --flat-playlist --dump-json --no-warnings --no-call-home`; streams stdout via `node:readline`; per-line: JSON parse → collect `{index, id, title, duration, durationString, url, thumbnail}` → `onProgress({fetched, total})` where `total` comes from `playlist_count`; waits for process exit; throws readable errors for empty/private/invalid playlists; then `fetchMissingDurations` re-pulls any video with `duration == null` in batches of 25 via `--no-playlist --simulate --dump-json` |

### `lib/rateLimit.js` (server)

| Function | Behavior |
| --- | --- |
| `checkRateLimit(ip)` | `{allowed:true}` when disabled or outside the 60-min window; else `{allowed:false, retryAfterMs}` |
| `recordFetch(ip)` | No-op when disabled; else stamps `cache[ip] = Date.now()` and writes `os.tmpdir()/tracktube-rate-limit.json` |
| (module) | `ENABLED = process.env.RATE_LIMITING === "true"`; in-memory cache is pruned of stale entries on load |

### `app/api/playlists/route.js`

1. Parse JSON body → `400` on missing/invalid body.
2. `validatePlaylistUrl` → `400` (before rate limiting — free).
3. `checkRateLimit` → `429 {error:"rate_limited", retryAfterMs}`.
4. Return `ReadableStream` with `Content-Type: application/x-ndjson`; each line:
   - `{"type":"progress","fetched":n,"total":m}`
   - `{"type":"done","data":{playlist,videos}}` (after `recordFetch(ip)`)
   - `{"type":"error","message":string}` on any failure (HTTP stays 200 — the status is inside the stream).

### `lib/storage.js` (client, pure)

- `emptyCore() / loadCore() / saveCore(core)`
- `addPlaylistToCore(core, playlist, videos)` — sets meta, data, and initializes progress
- `deletePlaylistFromCore(core, id)`
- `toggleVideoInProgress(progress, id, videoId)` — Set-based toggle + `savedAt`
- `setAllInProgress(progress, videoIds)` / `clearProgress(progress)`

### `lib/useCore.js` (client hook)

```js
const [core, dispatchRaw] = useReducer(reducer, null, () => loadCore());
const dispatch = (action) => {
  const next = reducer(coreRef.current, action); // compute
  coreRef.current = next;                        // keep ref in sync
  saveCore(next);                                // WRITE-THROUGH (synchronous)
  dispatchRaw(action);                           // re-render
};
```

Why write-through: a `useEffect`-based save races with `router.push()` — navigation can
unmount the page before the effect flushes, losing the newly added playlist. Write-through
guarantees persistence inside the action call itself.

Also listens to the `storage` event for cross-tab sync (`dispatch({type:"reload"})`).

## State reducer actions

| Action | Effect |
| --- | --- |
| `{type:"add", playlist, videos}` | Persist new playlist + data |
| `{type:"delete", id}` | Remove playlist, data, progress |
| `{type:"toggle", id, videoId}` | Toggle a video's marked state |
| `{type:"markAll", id, videoIds}` | Mark all videos |
| `{type:"clear", id}` | Clear marks |
| `{type:"reload", core}` | Replace with freshly loaded core (cross-tab) |

## Rendering details

- **Playlist page** computes `stats` (marked/total seconds) and `filtered` via `useMemo`, keyed on `videos`, `markedSet`, `search`, `filterTab`.
- **Donut**: SVG circle `strokeDasharray = C * pct%`, `stroke` applied via inline `style` (CSS `var()` in SVG presentation attributes breaks Safari).
- **Themes**: `[data-theme]` selectors in `globals.css`; pre-paint script in `layout.jsx`; `suppressHydrationWarning` on `<html>` because the script mutates `data-theme` before React hydrates.
- **Responsive**: `1200px` sidebar narrows → `960px` stacks layout → `640px` compact nav/grid → `480px` full-width thumbnails & single-column stats.
- **Pixel styling**: Press Start 2P for headings/buttons (9–13px, tiny by design), VT323 body, `border-width: 3px`, `box-shadow: 3px 3px 0` hard shadows, `:active` translate to fake button press, scanline overlay via `body::after`, `image-rendering: pixelated`.

## Local-first flow on playlist open

```
/playlists/[id] mounts
  → useCore() lazy-loads tracktube:core from localStorage
  → if core.playlists[id] && core.data[id] missing → "Playlist not found" + back link
  → else render Sidebar + VideoList with live stats
```