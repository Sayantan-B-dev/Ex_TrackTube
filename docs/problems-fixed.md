# Problems Fixed

Every issue encountered during development, root cause, and the fix. Each entry maps to a git commit where applicable.

## 1. React warning: mixing `border` shorthand with `borderColor`

**Symptom:** Dev console warned "Removing a style property during rerender (borderColor) when a conflicting property is set (border)".

**Cause:** Inline styles spread `...styles.row` (which used `border: 1px solid X`) and conditionally overrode `borderColor` for the selected state. React diffed shorthand vs longhand and flagged the conflict on every re-render.

**Fix:** Replaced the `border` shorthand with `borderWidth` / `borderStyle` / `borderColor` longhands in all dynamically-overridden styles (rows, tabs, checkboxes, buttons).

## 2. Stale `.next` cache — `__webpack_modules__[moduleId] is not a function`

**Symptom:** Dev server threw a webpack manifest runtime error (`__webpack_modules__[moduleId] is not a function`) and `GET /` returned 50.

**Cause:** The Next version was upgraded (15.3.4 → 15.5.23) while the old `.next` dev cache persisted, leaving mismatched chunk manifests.

**Fix:** Stopped the dev server, deleted `.next`, restarted. Builds then clean.

## 3. React 19.2.8 + Next 15.5 mismatch — devtools RSC manifest errors

**Symptom:** "Could not find the module ... segment-explorer-node.js ... in the React Client Manifest" and `[TypeError: __webpack_modules__[moduleId] is not a function]`.

**Cause:** `npm install next@15.5.23` also hoisted React to 19.2.x (installed via latest), while Next 15.5's RSC bundler expects the 19.1 line.

**Fix:** Pinned `react@19.1.0` + `react-dom@19.1.0` in `package.json`.

## 4. Streaming test was throttled by its own rate limiter

**Symptom:** QA script: first request `200`, every subsequent request `429 rate_limited`.

**Cause:** Correct behavior — the limiter was working. The in-memory cache (`cache` module variable) survives across requests within the same server process; deleting the temp file alone didn't reset it.

**Fix:** None needed (behavior is intended); tests now restart the server + delete the file. Documented in `docs/technical.md`.

## 5. Hydration mismatch — `data-theme` attribute

**Symptom:** "A tree hydrated but some attributes of the server rendered HTML didn't match" pointing at `<html>` — `data-theme="crt-green"` present client-side but absent in SSR HTML.

**Cause:** The pre-paint theme script in `layout.jsx` sets `document.documentElement.dataset.theme` before React hydrates; the server never renders that attribute.

**Fix:** Added `suppressHydrationWarning` on the `<html>` element (the standard pattern for theme scripts).

## 6. Rate limiter consumed by invalid requests

**Symptom:** Pasting a garbage link still "used up" the 1/hour slot; the next valid fetch was 429'd.

**Cause:** `recordFetch(ip)` ran in the route **before** URL validation and before the fetch result was known.

**Fix:** Moved URL validation before the rate-limit check (invalid URLs cost nothing, `400`), and moved `recordFetch(ip)` to **after** a successful fetch. Failed fetches no longer burn the slot.

## 7. "Playlist not found" right after adding a playlist

**Symptom:** Add playlist → POST 200 → redirected to `/playlists/[id]` → "Playlist not found". Happened consistently.

**Cause:** Persistence race. The add was dispatched via `useReducer`, but the localStorage write lived in a `useEffect`. The modal called `router.push()` synchronously right after dispatching; navigation unmounted the dashboard before the effect flushed, so the write was dropped.

**Fix:** Write-through dispatch in `lib/useCore.js` — compute the next state, save to localStorage synchronously inside the action, then notify React. Persistence is now guaranteed before navigation.

## 8. Missing global styles

**Symptom:** Page rendered completely unstyled; `contentscript.js` warnings in the console (browser wallet extension, unrelated).

**Cause:** `import "./globals.css"` was dropped from `app/layout.jsx` during the Phase-5 rewrite (theme script added).

**Fix:** Restored the import in `layout.jsx`.

## 9. Safari breaks SVG `stroke` with CSS variables

**Symptom:** (Prevented preemptively) Donut chart colors not following theme in Safari.

**Cause:** CSS `var()` used inside SVG presentation attributes (`stroke="var(--border)"`) is unreliable in Safari.

**Fix:** Applied `stroke` via React inline `style` (`style={{ stroke: "var(--accent)" }}`) which resolves variables reliably.

## 10. npm audit — 3 high vulnerabilities (transitive)

**Symptom:** `npm audit` reported high-severity issues in `postcss` (≤ 8.5.22, XSS / sourceMappingURL file-read) and `sharp` (< 0.35.0, libvips CVEs), pulled in by `next@15.5`.

**Cause:** Transitive dependency versions pinned by Next 15.5.23. The only "official" fix was a breaking upgrade to Next 16.

**Fix:** Added npm `overrides` in `package.json`: `postcss: ^8.5.26`, `sharp: ^0.35.3`. Result: `0 vulnerabilities`, build still clean, no Next major bump.

## 11. `_document` / chunk `unhandledRejection` during build

**Symptom:** Occasional `unhandledRejection [PageNotFoundError]: Cannot find module for page: /_document` (or `./611.js`) printed mid-build.

**Cause:** Transient prerender noise in the Next 15.5 build collector — the build itself completed successfully every time when re-run.

**Fix:** None (non-fatal). Confirmed stable with repeated clean full builds.

## 12. Playlist IDs can arrive as `watch?v=...&list=...` URLs

**Symptom:** (Prevented preemptively) Users paste video URLs with `&list=` params.

**Cause:** `validatePlaylistUrl` only recognized `/playlist` paths.

**Fix:** Validation accepts any `youtube.com`/`youtu.be` URL carrying a `list` query param; yt-dlp extracts the playlist correctly from these links.