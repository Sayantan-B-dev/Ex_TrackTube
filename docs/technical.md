# Technical Documentation

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router) |
| UI | React 19, plain CSS (no UI library) |
| Extraction | yt-dlp via `child_process.spawn` (server-side) |
| Storage | Supabase (Postgres) when logged in; `localStorage` fallback when logged out |
| Auth | Custom: bcrypt-hashed passwords + JWT (`jsonwebtoken`) |
| Fonts | Press Start 2P + VT323 (self-hosted in `public/fonts`) |

## Environment

| Var | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL (Settings → API) |
| `SUPABASE_ANON_KEY` | Public anon key (kept for Supabase clients) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key (bypasses RLS) — never client-side |
| `JWT_SECRET` | Secret that signs/verifies the app's own JWTs |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `RATE_LIMITING` | `"true"`/`"false"` — yt-dlp fetch rate limit |

## Supabase schema

Run `supabase_query.db` once in the Supabase SQL Editor (idempotent — safe to re-run).

| Table | Purpose |
| --- | --- |
| `users` | `id uuid PK`, `username text UNIQUE`, `password_hash text` (bcrypt), timestamps |
| `playlists` | `id uuid PK`, `user_id FK → users ON DELETE CASCADE`, title, channel, url, `total_videos`, `total_seconds` |
| `playlist_videos` | `id uuid PK`, `playlist_id FK → playlists CASCADE`, `youtube_id`, title, duration, position; UNIQUE (`playlist_id`, `youtube_id`) |
| `progress` | marked videos: composite PK (`playlist_id`, `video_id`), `marked_at` |

- **RLS is enabled on every table with no policies** — the anon/authenticated roles can't read or write anything. The server talks to the DB with the service-role key, which bypasses RLS.
- **RPCs** (transactional): `create_playlist(p_user_id, p_url, p_title, p_channel, p_videos jsonb)` inserts the playlist + all videos in one transaction; `set_progress(p_user_id, p_playlist_id, p_youtube_ids text[])` replaces the marked set atomically (ids are YouTube IDs, translated to uuids inside).
- Triggers keep `updated_at` fresh on `users` and `playlists`.

## Auth flow (bcrypt + JWT)

```
Register:  username (3–20 chars) + password (≥ 6 chars)
           → bcrypt.hash(password, 10) → INSERT users → JWT {sub: user.id, username}
Login:     username → bcrypt.compare(password, hash) → JWT
Every API: Authorization: Bearer <jwt> → jwt.verify → user id
```

- Token stored client-side in `localStorage` under `tracktube:token` by `lib/useAuth.js`.
- `getUserFromRequest(req)` in `lib/auth.js` extracts + verifies the Bearer token; `401` otherwise.
- `tracktube:core` (localStorage) and `tracktube:theme` remain the anonymous-mode keys.

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
   (logged in) POST /api/playlists/save {title, url, channel, videos[]}
       → RPC create_playlist → 201 {playlist, videos[with uuids]}
   (logged out) dispatch("add") → localStorage write-through
◀── modal closes → router.push(/playlists/<new id>)
```

The fetch response is a **streaming NDJSON** (`application/x-ndjson`) so progress is live. Each
parsed line yields a `progress` message; the final line is `done` or `error`.

## Storage modes

Single client key (anonymous): `tracktube:core`

```jsonc
{
  "playlists": { "PLC3y8-...": { "id": "...", "title": "...", "channel": "...",
      "url": "...", "addedAt": "...", "totalVideos": 92, "totalSeconds": 25381 } },
  "data": { "PLC3y8-...": { "playlist": "…", "videos": [{ "index": 1, "id": "b4ba60j_4o8",
      "title": "…", "duration": 256, "durationString": "4:16", "thumbnail": "…" }] } },
  "progress": { "PLC3y8-...": { "ids": ["b4ba60j_4o8"], "savedAt": "…" } }
}
```

Logged-in mode: `useCore` rebuilds this exact shape from `GET /api/playlists` — playlist ids are
DB uuids, videos carry `id` = YouTube id + `uuid` = DB uuid, `markedIds` come from the `progress`
table. Every dispatch action maps to an API call (see below). Other keys: `tracktube:theme`,
`tracktube:token`, rate-limit file at `os.tmpdir()/tracktube-rate-limit.json`.

## Server modules

| Module | Responsibility |
| --- | --- |
| `lib/playlist.js` | `validatePlaylistUrl`, `fetchPlaylist(url, onProgress)` — spawns yt-dlp, stream-parses NDJSON with `readline`, re-fetches any video missing a duration (batches of 25, `--no-playlist`), builds the final JSON |
| `lib/rateLimit.js` | File-persisted per-IP window (1/hour). `ENABLED = process.env.RATE_LIMITING === "true"` |
| `lib/supabase.js` | Lazy server-only service-role client (`@supabase/supabase-js`); throws a readable error if env vars are missing |
| `lib/auth.js` | `hashPassword` / `verifyPassword` (bcryptjs, 10 rounds), `signToken` / `verifyToken` (jsonwebtoken), `getUserFromRequest`, `jsonError` |
| `lib/playlistDb.js` | `listUserPlaylists` (embeds videos + marked YouTube IDs), `getUserPlaylist`, `createPlaylist` (RPC), `updatePlaylistProgress` (RPC, delete+insert fallback for stale schema cache), `renameUserPlaylist`, `deleteUserPlaylist` |
| `app/api/playlists/route.js` | GET: auth + list; POST: validate → rate-limit → stream yt-dlp progress → done/error |

## Client modules

| Module | Responsibility |
| --- | --- |
| `lib/useAuth.js` | `AuthProvider` + `useAuth()`: token in `tracktube:token`, restore session via `/api/auth/me`, `login/register/logout` helpers |
| `lib/useCore.js` | `useCore()` hook: loads from Supabase when logged in (fallback: localStorage), async dispatch maps actions to API calls, `ready` flag, `playlists` selector |
| `lib/storage.js` | Pure functions over the core JSON (anonymous mode) |
| `lib/format.js` | `formatDuration`, `humanize`, `timeLeftIn` |
| `lib/themes.js` | 10 theme definitions, load/save theme id |
| `components/NavBar.jsx` | Brand, theme picker, auth state (Log in/Register or username + Log out), add-playlist button |
| `components/AddPlaylistModal.jsx` | URL form, streamed progress bar, awaits DB save, error/rate-limit states |
| `components/ConfirmModal.jsx` | Reusable confirmation popup (Escape/Enter keys) |
| `components/Sidebar.jsx` | Analytics panel (donut, stats, longest, filters, actions) |
| `components/VideoList.jsx` | Video cards list (unique keys via `uuid` / `id-index`) |

## API routes

| Route | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | — | Create user, return `{token, user}` |
| `/api/auth/login` | POST | — | Verify credentials, return `{token, user}` |
| `/api/auth/me` | GET | ✅ | Current user from Bearer token |
| `/api/playlists` | GET | ✅ | List playlists + videos + marked ids |
| `/api/playlists` | POST | — | Streaming yt-dlp fetch (rate-limited) |
| `/api/playlists/save` | POST | ✅ | Persist fetched playlist + videos |
| `/api/playlists/[id]` | GET / PATCH / DELETE | ✅ | Detail; set progress (`{videoIds}`) or rename (`{title}`); delete (cascade) |

## Theme system

- CSS custom properties on `[data-theme="..."]` selectors; 10 variants in `app/globals.css`.
- `app/layout.jsx` ships an inline pre-paint script that sets `data-theme` from localStorage (with `suppressHydrationWarning` on `<html>`).
- Themes: crt-green, sunset, ocean, blood, forest, purple-haze, mono, candy, ember, night-blue.

## Known limitations

- Anonymous mode is capped by the `localStorage` quota (~5 MB).
- Rate limit is per IP as seen by the server; behind a proxy, set `X-Forwarded-For` correctly.
- yt-dlp must be installed on the host.
- Progress updates are optimistic; a failed PATCH leaves local state until the next reload.