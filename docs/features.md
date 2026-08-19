# Features

## 1. Accounts (username + bcrypt + JWT)

- **Register** (`/register`) or **log in** (`/login`) with a username and password.
- Passwords are never stored in plain text — bcrypt-hashed (10 rounds) in the `users` table.
- Sessions are basic JWTs signed with `JWT_SECRET`, held in `localStorage` (token only), sent as `Authorization: Bearer` on every API call.
- Logged in, the navbar shows **Your playlists**, your username and **Log out**; logged out it shows **Login first** / **Register**. Playlists are tied to your account and sync across devices/browsers — signed out you see nothing (private pages render a "Log in first" gate).
- On small screens (≤ 640px) the navbar collapses into a hamburger dropdown menu with the same actions.

## 2. Add any YouTube playlist

- Click **+ Add playlist** in the nav bar (login required).
- Paste a link — accepts `youtube.com/playlist?list=...`, `youtube.com/watch?v=...&list=...`, and `youtu.be` links.
- Hit **Process**. The server runs `yt-dlp --flat-playlist --dump-json` and streams results back line-by-line over an NDJSON response.
- A **live progress bar** shows `fetched X of Y videos` while streaming.
- On completion the playlist metadata + videos are **saved to your account (Supabase)** — the modal closes and you stay on the current page.
- Invalid links, empty/private playlists, network errors and rate limits all get friendly pixel-art error panels.

## 2. Playlist page

Two-pane layout:

**Left sidebar**
- Playlist title, channel, link to YouTube
- **Analytics donut** — marked vs unmarked time, animated, with center percentage
- **Stats grid** — Total, Marked, Time left, Progress %
- **Longest videos** — top 5 with mini bars
- **Filters** — search box + tabs: All / Marked / Not marked (with live counts)
- **Actions** — Mark all, Clear all, Reset progress (all behind confirmation popups)
- Auto-save status with last-change time

**Right pane**
- Scrollable video cards: thumbnail, index, title, duration badge, marked state
- Sticky summary bar: `X shown · marked time · time left`

## 3. Progress tracking

- Click any video card to mark/unmark it.
- All totals recalculate instantly: marked time, time left, progress %.
- Progress is saved on every change — to your account in Supabase (`PATCH /api/playlists/[id]`).

## 4. Playlists home

- Lives at `/playlists` ("Your playlists"): grid of all added playlists: title, channel, video count, total time, progress bar + %, **Open →**
- Delete playlist (with confirmation) — removes the playlist **and** its videos and progress from the DB (FK cascades)
- Empty state with a big call-to-action when nothing is added yet

## 5. Home page

- Info landing at `/` (visible to everyone): animated pixel-art background, marquee ticker, features and how-it-works sections
- CTAs adapt to auth state: Get started / Log in when signed out, "Your playlists →" when signed in

## 6. Themes

- 10 dark pixel themes selectable from the nav bar (persisted per browser).
- Applied via `data-theme` attribute; pre-paint script prevents theme flash.
- Scanline overlay, pixel font pair (Press Start 2P headings, VT323 body), hard shadows, stepped corners.

## 7. Rate limiting

- When `RATE_LIMITING=true` in `.env.local`: max **1 playlist fetch per hour per IP**.
- Timestamps persisted to a temp-file JSON, so restarts don't reset the window.
- Only **successful** fetches consume a slot — invalid URLs and failed fetches don't count.
- When `RATE_LIMITING=false` (or unset): unlimited.