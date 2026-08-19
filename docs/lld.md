# Low-Level Design (LLD)

## Module map

```
nextjsread/
├── app/
│   ├── layout.jsx                  Root layout: CSS import, theme init script, Providers wrapper
│   ├── providers.jsx               "use client" AuthProvider wrapper (lib/useAuth)
│   ├── page.jsx                    Dashboard (client): playlist cards, add/delete modals
│   ├── globals.css                 All styles + 10 theme variable sets + media queries
│   ├── login/page.jsx              Login page (client): form → useAuth.login → redirect
│   ├── register/page.jsx           Register page (client): validation → useAuth.register
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/route.js   POST: validate, bcrypt-hash, insert user, JWT
│   │   │   ├── login/route.js      POST: verify password, JWT
│   │   │   └── me/route.js         GET: verify Bearer token → user
│   │   └── playlists/
│   │       ├── route.js            GET: auth + list; POST: streaming NDJSON fetch (yt-dlp)
│   │       ├── save/route.js       POST: auth + persist playlist/videos (create_playlist RPC)
│   │       └── [id]/route.js       GET/PATCH/DELETE: detail, set progress, rename, delete
│   └── playlists/
│       └── [id]/
│           └── page.jsx            Playlist tracker page (client)
├── components/
│   ├── NavBar.jsx                  Brand, theme picker, auth state, add-playlist button
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
│   ├── supabase.js                 Server: lazy service-role client (throws if env missing)
│   ├── auth.js                     Server: bcrypt hash/verify + JWT sign/verify + request user
│   ├── playlistDb.js               Server: Supabase queries + RPC calls for playlist CRUD
│   ├── storage.js                  Client: pure core-JSON operations (anonymous mode)
│   ├── useCore.js                  Client: reducer hook; Supabase-backed when logged in
│   ├── useAuth.js                  Client: AuthProvider + useAuth (token, login/register/logout)
│   ├── format.js                   Time formatting helpers
│   └── themes.js                   10 theme definitions + persistence
├── supabase_query.db               SQL schema + RPCs for the Supabase SQL Editor
├── public/
│   └── fonts/                      press-start-2p.woff2, vt323.woff2
└── .env.example                    Supabase URL/keys, JWT secret, RATE_LIMITING
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

### `lib/supabase.js` (server)

`createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` exported as a lazy `Proxy` — options
(`auth.persistSession: false`) fixed; if either env var is missing the proxy throws a readable
error on first use (so `next build` works before `.env.local` is filled).

### `lib/auth.js` (server)

| Function | Behavior |
| --- | --- |
| `hashPassword(pw)` / `verifyPassword(pw, hash)` | bcryptjs, 10 rounds |
| `signToken(user)` | `jwt.sign({username}, JWT_SECRET, {subject: user.id, expiresIn: JWT_EXPIRES_IN})` |
| `verifyToken(token)` | Throws on invalid/expired |
| `getUserFromRequest(req)` | Extracts `Bearer` header, verifies → `{id, username}` or `null` |
| `jsonError(status, code, message)` | Uniform `Response.json({error, message})` |

### `lib/playlistDb.js` (server)

| Function | Behavior |
| --- | --- |
| `listUserPlaylists(userId)` | Playlists + videos + marked rows in one query; uses the explicit FK embed `playlist_videos!playlist_videos_playlist_id_fkey(...)` because `progress` creates a second relationship path |
| `getUserPlaylist(userId, id)` | Single playlist + videos + `markedIds` (uuids) |
| `createPlaylist(userId, {url,title,channel,videos})` | RPC `create_playlist` (atomic insert of playlist + videos) |
| `updatePlaylistProgress(userId, id, youtubeIds)` | RPC `set_progress(text[])`; on `PGRST202` (stale PostgREST schema cache) falls back to delete + insert |
| `renameUserPlaylist(userId, id, title)` | Update title, returns `false` when not found |
| `deleteUserPlaylist(userId, id)` | Delete row (FKs cascade videos + progress) |

### `app/api/playlists/save/route.js`

Auth required. Body `{url, title, channel, videos:[{youtubeId,title,duration}]}` → validation →
`createPlaylist` RPC → refetch the video rows ordered by `position` → `201 {playlist, videos}`.

### `app/api/playlists/[id]/route.js`

All handlers `const {id} = await params` (Next 15 async params). GET → detail or 404.
PATCH → `{videoIds: string[]}` (YouTube ids, replaces set) or `{title}` rename. DELETE → cascade delete.

### `lib/useAuth.js` (client)

`AuthProvider` restores the session on mount: reads `tracktube:token`, calls `/api/auth/me`,
removes the token on `401`. Exposes `{user, loading, login, register, logout}`.

### `lib/storage.js` (client, pure)

- `emptyCore() / loadCore() / saveCore(core)`
- `addPlaylistToCore(core, playlist, videos)` — sets meta, data, and initializes progress
- `deletePlaylistFromCore(core, id)`
- `toggleVideoInProgress(progress, id, videoId)` — Set-based toggle + `savedAt`
- `setAllInProgress(progress, videoIds)` / `clearProgress(progress)`

### `lib/useCore.js` (client hook)

Two modes, selected by auth state:

**Anonymous (localStorage):** unchanged write-through dispatch — synchronous `saveCore` inside
the action to beat navigation races.

**Logged in (Supabase):** on mount (and on login/logout) the effect fetches
`GET /api/playlists` and rebuilds the core in-memory shape, with `ready` flipping true when the
first load settles (pages show "Loading…" until then). Dispatch becomes an async per-action API
call:

| Action (logged in) | API call |
| --- | --- |
| `{type:"add", playlist, videos}` | `POST /api/playlists/save` → uses returned uuid for the core entry; resolves to the new playlist so the modal can navigate |
| `{type:"delete", id}` | `DELETE /api/playlists/[id]` |
| `{type:"toggle"\|"markAll"\|"clear", id, …}` | reducer update first (optimistic UI), then `PATCH /api/playlists/[id]` with the full marked set (`savedAt` refreshed) |
| `{type:"reload", core}` | local replace |

DB video rows are mapped to the UI shape in `videoFromDb`: `id` = YouTube id, `uuid` = DB uuid
(React keys), `thumbnail` = `i.ytimg.com/vi/<id>/hqdefault.jpg`, `index`, `durationString`.
Failure handling: `401` → auto logout (triggers reload); `add`-time errors rethrow to the modal;
mutation errors keep local state until next reload.

Cross-tab sync (`storage` event) still applies to anonymous mode.

## State reducer actions

| Action | Effect (anonymous) | Effect (logged in) |
| --- | --- | --- |
| `{type:"add", playlist, videos}` | Persist new playlist + data | POST save → rebuild entry from response |
| `{type:"delete", id}` | Remove playlist, data, progress | DELETE API → remove from core |
| `{type:"toggle", id, videoId}` | Toggle a video's marked state | Optimistic toggle + PATCH full set |
| `{type:"markAll", id, videoIds}` | Mark all videos | Optimistic + PATCH full set |
| `{type:"clear", id}` | Clear marks | Optimistic + PATCH `[]` |
| `{type:"reload", core}` | Replace with freshly loaded core (cross-tab / first load) | — |

## Rendering details

- **Playlist page** computes `stats` (marked/total seconds) and `filtered` via `useMemo`, keyed on `videos`, `markedSet`, `search`, `filterTab`.
- **Donut**: SVG circle `strokeDasharray = C * pct%`, `stroke` applied via inline `style` (CSS `var()` in SVG presentation attributes breaks Safari).
- **Themes**: `[data-theme]` selectors in `globals.css`; pre-paint script in `layout.jsx`; `suppressHydrationWarning` on `<html>` because the script mutates `data-theme` before React hydrates.
- **Responsive**: `1200px` sidebar narrows → `960px` stacks layout → `640px` compact nav/grid → `480px` full-width thumbnails & single-column stats.
- **Pixel styling**: Press Start 2P for headings/buttons (9–13px, tiny by design), VT323 body, `border-width: 3px`, `box-shadow: 3px 3px 0` hard shadows, `:active` translate to fake button press, scanline overlay via `body::after`, `image-rendering: pixelated`.

## Local-first flow on playlist open

```
/playlists/[id] mounts
  → useCore() waits for auth, then loads (Supabase: GET /api/playlists, or localStorage)
  → if core.playlists[id] && core.data[id] missing → "Playlist not found" + back link
  → else render Sidebar + VideoList with live stats
```

Keying note: playlist ids are **DB uuids** when logged in (the id you see in the URL), YouTube
playlist ids in anonymous mode. Video keys use `uuid` (DB) or `id-index` (anonymous/duplicates).