# TrackTube

Track your progress across any YouTube playlist — with a retro pixel-art UI.

Paste any YouTube playlist link, TrackTube fetches all video metadata via **yt-dlp**, and lets you mark videos as watched while live-counting your marked time, remaining time and progress — all persisted in your browser's **localStorage**. No accounts, no database.

## Features

- ➕ **Add any YouTube playlist** — paste a link, watch a live progress bar while metadata streams in
- 📊 **Analytics sidebar** — animated donut chart (marked vs remaining), total/marked/time-left stats, longest-videos breakdown
- ⏱️ **Live time totals** — select videos and the marked time & time left update instantly (`H:MM:SS` + humanized)
- 🔍 **Filters** — search by title, tabs for All / Marked / Not marked
- 💾 **Local-first** — playlists, metadata and progress all live in `localStorage`; auto-saved on every change
- 🛡️ **Rate limiting** — 1 playlist fetch per hour per IP (file-persisted, toggleable via env)
- 🎨 **10 dark pixel themes** — CRT Green, Sunset, Ocean, Blood, Forest, Purple Haze, Mono, Candy, Ember, Night Blue
- 🕹️ **Pixel-art aesthetic** — Press Start 2P + VT323 fonts, scanlines, hard pixel shadows
- 📱 **Responsive** — sidebar stacks on top for mobile, cards adapt down to small screens
- ⚠️ **Confirm popups** for destructive actions (Mark all, Clear all, Reset, Delete playlist)

## Tech Stack

- **Next.js 15** (App Router) + React 19
- **yt-dlp** — server-side playlist metadata extraction (streamed, no temp files)
- **localStorage** — single-core-JSON persistence
- No database, no external API keys

## Quick Start

```bash
npm install
cp .env.example .env.local   # set RATE_LIMITING=true/false
npm run dev                  # http://localhost:3000
```

Requires [yt-dlp](https://github.com/yt-dlp/yt-dlp) on the host machine (`yt-dlp --version`).

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/features.md](docs/features.md) | Feature-by-feature overview |
| [docs/technical.md](docs/technical.md) | Architecture, data flow, storage schema, API |
| [docs/hld.md](docs/hld.md) | High-Level Design (mermaid diagrams) |
| [docs/lld.md](docs/lld.md) | Low-Level Design (modules, functions) |
| [docs/problems-fixed.md](docs/problems-fixed.md) | Every bug encountered & how it was fixed |

## License

MIT