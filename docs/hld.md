# High-Level Design (HLD)

## System context

```mermaid
flowchart LR
    U[User Browser] -->|"paste playlist URL"| W[Next.js App]
    W -->|"spawn + stream NDJSON"| Y[yt-dlp]
    Y -->|"video metadata"| W
    W -->|"register/login (bcrypt + JWT)"| A[Auth API]
    A -->|"store hash / verify"| DB[(Supabase Postgres)]
    W -->|"CRUD playlists/progress"| DB
    U -->|"JWT in localStorage"| W
    W -->|"anonymous fallback"| LS[(localStorage)]
    W -->|"rate-limit check"| RL[(temp file: rate-limit.json)]
```

Two storage modes:

- **Logged in**: playlists, videos and progress live in **Supabase** (user-scoped rows, RLS locked down; server talks via the service-role key). Auth is self-made: bcrypt-hashed passwords + JWT.
- **Logged out**: everything stays in the browser's **localStorage** (original local-first behavior).

## Component view

```mermaid
flowchart TD
    subgraph Client
        NAV[NavBar] --> TP[ThemePicker]
        NAV --> AP[AddPlaylistModal]
        HOME[Dashboard page /] --> UC[useCore hook]
        PL[Playlist page /playlists/[id]] --> UC
        UC -->|"token + CRUD"| API
        UC -->|"anonymous fallback"| LS[(localStorage)]
        NAV -->|"login/register/logout"| AUTH[useAuth hook]
        REG[Register page] --> AUTH
        LOG[Login page] --> AUTH
        PL --> SB[Sidebar]
        PL --> VL[VideoList]
        SB --> DN[Donut]
        SB --> MB[MiniBar]
        AP -->|"POST /api/playlists (stream)"| API
    end

    subgraph Server
        API[Route Handlers] --> RL[rateLimit]
        API --> FETCH[fetchPlaylist]
        FETCH --> Y[yt-dlp child process]
        API --> AUTHAPI[Auth + CRUD handlers]
        AUTHAPI --> SUP[lib/supabase service-role client]
        SUP --> DB[(Supabase Postgres)]
    end
```

## Data flow — fetch lifecycle

```mermaid
sequenceDiagram
    participant M as AddPlaylistModal
    participant R as API route
    participant Y as yt-dlp
    participant C as useCore
    participant S as Supabase

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
    alt logged in
        M->>C: dispatch("add")
        C->>S: POST /api/playlists/save (create_playlist RPC)
        S-->>C: 201 playlist + video uuids
        C-->>M: created playlist id
    else logged out
        M->>C: dispatch("add") → localStorage write-through
    end
    M->>M: router.push(/playlists/[new id])
    C-->>PL: playlist page reads core (Supabase or localStorage)
```

## Progress sync (logged in)

```mermaid
sequenceDiagram
    participant V as VideoList/Sidebar
    participant C as useCore
    participant S as Supabase

    V->>C: dispatch(toggle | markAll | clear)
    C->>C: optimistic reducer update (instant UI)
    C->>S: PATCH /api/playlists/[id] {videoIds}
    S->>S: set_progress RPC (atomic replace)
    S-->>C: {ok, markedCount}
```

Every toggle replaces the full marked set, so the DB always ends up consistent with the last local state (last-write-wins). All CRUD actions require `Authorization: Bearer <jwt>`.

## Deployment shape

```mermaid
flowchart LR
    FE[Next.js standalone] --> OS[Host with yt-dlp installed]
    OS --> FS[OS temp dir for rate-limit file]
    OS --> DB[(Supabase project — tables from supabase_query.db)]
    OS --> BR[Browser localStorage for anonymous users]
```

## Security & limits

- **Passwords**: never stored — bcrypt (10 rounds) hashes only.
- **Sessions**: JWT signed with `JWT_SECRET` (env, never committed); `/api/auth/me` validates on restore; expired/invalid tokens → `401` → auto logout.
- **Authorization**: every CRUD route re-derives the user from the token server-side and scopes all queries by `user_id`.
- **Database**: RLS enabled on all four tables with no public policies — only the server's service-role key can touch the data.
- **Rate limiting**: 1 successful fetch/hour/IP, persisted to disk (survives restarts), env-toggleable (`RATE_LIMITING`).
- **Input validation**: server-side URL validation before any work; invalid input costs no rate-limit slot.
- **Client safety**: only YouTube video IDs are used in thumbnail URLs; playlist data is inert JSON.