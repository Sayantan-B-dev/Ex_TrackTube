# Technical Documentation

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 (App Router) |
| UI | React 19, plain CSS (no UI library) |
| Extraction | yt-dlp via `child_process.spawn` (server-side) |
| Storage | Supabase (Postgres), account-scoped — no client-side playlist storage |
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

- Token stored client-side in `localStorage` under `tracktube:token` by `lib/useAuth.js` (JWT only — playlist data never touches `localStorage`).
- `getUserFromRequest(req)` in `lib/auth.js` extracts + verifies the Bearer token; `401` otherwise.
- `tracktube:theme` is the only other browser key.

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
   POST /api/playlists/save {title, url, channel, videos[]}   (auth required)
       → RPC create_playlist → 201 {playlist, videos[with uuids]}
◀── modal closes — stays on the current page (list stays in /playlists)
```

The fetch response is a **streaming NDJSON** (`application/x-ndjson`) so progress is live. Each
parsed line yields a `progress` message; the final line is `done` or `error`.

## Storage

The whole app is **account-only**: signed out, `useCore` loads `emptyCore`, `ready` becomes
true and `dispatch` is a no-op — nothing is persisted on the client. Playlists, videos and
progress live exclusively in Supabase (see schema). Client shape after `GET /api/playlists`:

```jsonc
{
  "playlists": { "<db-uuid>": { "id": "<db-uuid>", "title": "...", "channel": "...",
      "url": "...", "addedAt": "...", "totalVideos": 92, "totalSeconds": 25381 } },
  "data": { "<db-uuid>": { "playlist": "…", "videos": [{ "index": 1, "id": "b4ba60j_4o8",
      "uuid": "<db-uuid>", "title": "…", "duration": 256, "durationString": "4:16",
      "thumbnail": "…" }] } },
  "progress": { "<db-uuid>": { "ids": ["<video-uuid>"], "savedAt": "…" } }
}
```

Every dispatch action maps to an API call (see below). Other browser keys: `tracktube:theme`,
`tracktube:token`; rate-limit file at `os.tmpdir()/tracktube-rate-limit.json`. Deleting a
playlist (`DELETE /api/playlists/[id]`) relies on the DB cascades — `playlist_videos` and
`progress` rows are removed automatically.

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
| `lib/useCore.js` | `useCore()` hook: loads from `GET /api/playlists` when logged in (empty no-op core when signed out), async dispatch maps actions to API calls, `ready` flag, `playlists` selector |
| `lib/storage.js` | Pure functions over the core JSON shape (no persistence of its own) |
| `lib/format.js` | `formatDuration`, `humanize`, `timeLeftIn` |
| `lib/themes.js` | 10 theme definitions, load/save theme id |
| `components/NavBar.jsx` | Brand, theme picker, auth state (Log in/Register or username + Log out), add-playlist button; hamburger dropdown menu on ≤ 640px |
| `components/LoginRequired.jsx` | Login gate for private pages (title + message + Log in / Register CTAs) |
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

- Playlists are account-only: you must be logged in (registration is free).
- Rate limit is per IP as seen by the server; behind a proxy, set `X-Forwarded-For` correctly.
- yt-dlp must be installed on the host.
- Progress updates are optimistic; a failed PATCH leaves local state until the next reload.

## Migration

Run the following SQL once in your Supabase SQL Editor (idempotent — safe to re-run):

```sql
alter table public.playlists
  add column if not exists is_currently_watching boolean not null default false,
  add column if not exists last_viewed_at timestamptz;

create index if not exists idx_playlists_last_viewed
  on public.playlists (user_id, last_viewed_at desc);
create index if not exists idx_playlists_currently_watching
  on public.playlists (user_id) where is_currently_watching;
```