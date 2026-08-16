# High-Level Design (HLD)

## System context

```mermaid
flowchart LR
    U[User Browser] -->|"paste playlist URL"| W[Next.js App]
    W -->|"spawn + stream NDJSON"| Y[yt-dlp]
    Y -->|"video metadata"| W
    W -->|"save core JSON"| LS[(localStorage)]
    U -->|"read/write"| LS
    W -->|"rate-limit check"| RL[(temp file: rate-limit.json)]
```

Everything is **local-first**. The only external dependency is yt-dlp (server-side), and the
only persistence is the browser's localStorage. No database, no third-party APIs.

## Component view

```mermaid
flowchart TD
    subgraph Client
        NAV[NavBar] --> TP[ThemePicker]
        NAV --> AP[AddPlaylistModal]
        HOME[Dashboard page /] --> UC[useCore hook]
        PL[Playlist page /playlists/[id]] --> UC
        UC --> LS[(localStorage)]
        PL --> SB[Sidebar]
        PL --> VL[VideoList]
        SB --> DN[Donut]
        SB --> MB[MiniBar]
        AP -->|"POST /api/playlists"| API
    end

    subgraph Server
        API[Route Handler] --> RL[rateLimit]
        API --> FETCH[fetchPlaylist]
        FETCH --> Y[yt-dlp child process]
    end
```

## Data flow — fetch lifecycle

```mermaid
sequenceDiagram
    participant M as AddPlaylistModal
    participant R as API route
    participant Y as yt-dlp
    participant C as useCore/localStorage

    M->>R: POST {url}
    R->>R: validate URL (400 if bad, no slot used)
    R->>R: checkRateLimit (429 if throttled)
    R->>Y: spawn --flat-playlist --dump-json
    loop per parsed video line
        Y-->>R: NDJSON line
        R-->>M: {type:"progress", fetched, total}
    end
    Y-->>R: process exit
    R->>R: fetchMissingDurations (only if any)
    R->>R: recordFetch(ip) — successful only
    R-->>M: {type:"done", playlist, videos}
    M->>C: dispatch("add") → write-through save
    M->>M: router.push(/playlists/[id])
    C-->>PL: playlist page reads core from localStorage
```

## Deployment shape

```mermaid
flowchart LR
    FE[Next.js standalone] --> OS[Host with yt-dlp installed]
    OS --> FS[OS temp dir for rate-limit file]
    OS --> BR[Browser localStorage per user]
```

## Security & limits

- **Rate limiting**: 1 successful fetch/hour/IP, persisted to disk (survives restarts), env-toggleable (`RATE_LIMITING`).
- **Input validation**: server-side URL validation before any work; invalid input costs no rate-limit slot.
- **No secrets**: no API keys; yt-dlp runs with `--no-call-home`.
- **Client safety**: only YouTube video IDs are used in thumbnail URLs (built server-side); playlist data is inert JSON.