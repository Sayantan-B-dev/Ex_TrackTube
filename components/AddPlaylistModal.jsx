"use client";

import { useEffect, useRef, useState } from "react";

const RATE_LIMIT_MS = 60 * 60 * 1000;

export default function AddPlaylistModal({ open, onClose, onAdd }) {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState("idle"); // idle | fetching | done | error
  const [progress, setProgress] = useState({ fetched: 0, total: 0 });
  const [error, setError] = useState(null);
  const [rateRetryMs, setRateRetryMs] = useState(0);
  const abortRef = useRef(null);

  useEffect(() => {
    if (open) {
      setUrl("");
      setPhase("idle");
      setProgress({ fetched: 0, total: 0 });
      setError(null);
      setRateRetryMs(0);
    }
  }, [open]);

  useEffect(() => {
    if (!rateRetryMs) return;
    const t = setInterval(() => {
      setRateRetryMs((ms) => {
        const next = Math.max(0, ms - 1000);
        if (next === 0) clearInterval(t);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [rateRetryMs]);

  if (!open) return null;

  const handleProcess = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setPhase("error");
      setError("Please paste a YouTube playlist link first.");
      return;
    }
    setPhase("fetching");
    setError(null);
    setProgress({ fetched: 0, total: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        setRateRetryMs(body.retryAfterMs ?? RATE_LIMIT_MS);
        setPhase("error");
        setError(
          "Rate limit reached: one playlist fetch per hour per device. Try again later."
        );
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setPhase("error");
        setError(body.message || "Something went wrong on the server.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          let msg;
          try {
            msg = JSON.parse(line);
          } catch {
            continue;
          }
          if (msg.type === "progress") {
            setProgress({ fetched: msg.fetched, total: msg.total });
          } else if (msg.type === "done") {
            try {
              await onAdd(msg.data.playlist, msg.data.videos);
              setPhase("done");
              onClose();
            } catch (err) {
              setPhase("error");
              setError(err.message || "The playlist was fetched but could not be saved.");
            }
            return;
          } else if (msg.type === "error") {
            setPhase("error");
            setError(msg.message);
            return;
          }
        }
      }

      setPhase("error");
      setError("The connection closed before the playlist was fetched.");
    } catch (err) {
      if (err.name === "AbortError") return;
      setPhase("error");
      setError(err.message || "Network error while fetching the playlist.");
    }
  };

  const cancelFetch = () => {
    abortRef.current?.abort();
    setPhase("idle");
  };

  const pct =
    progress.total > 0 ? Math.round((progress.fetched / progress.total) * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={phase === "fetching" ? cancelFetch : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add playlist</h2>
          <button
            className="btn btn-icon"
            onClick={phase === "fetching" ? cancelFetch : onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {phase !== "fetching" && (
            <div className="field">
              <label className="field-label" htmlFor="playlist-url">
                YouTube playlist link
              </label>
              <input
                id="playlist-url"
                className="input"
                placeholder="https://www.youtube.com/playlist?list=..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (phase === "error") setPhase("idle");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && phase === "idle") handleProcess();
                }}
                autoFocus
              />
              <p className="field-hint">
                The playlist is fetched on the server via yt-dlp, then saved to
                your account (Supabase).
              </p>
            </div>
          )}

          {phase === "fetching" && (
            <div className="fetching">
              <div className="spinner" aria-hidden />
              <p className="fetching-title">Fetching playlist…</p>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <p className="fetching-info">
                {progress.total > 0
                  ? `${progress.fetched} of ${progress.total} videos`
                  : "Reading playlist…"}
              </p>
            </div>
          )}

          {phase === "error" && (
            <div className="error-box">
              <p className="error-title">⚠ Could not add playlist</p>
              <p className="error-message">{error}</p>
              {rateRetryMs > 0 && (
                <p className="error-hint">
                  Retry available in{" "}
                  {Math.ceil(rateRetryMs / 60000)} min{" "}
                  {Math.ceil((rateRetryMs % 60000) / 1000)} s
                </p>
              )}
            </div>
          )}
        </div>

        {phase !== "fetching" && (
          <div className="modal-footer">
            <button className="btn" onClick={onClose}>
              {phase === "error" ? "Back" : "Cancel"}
            </button>
            <button className="btn btn-primary" onClick={handleProcess}>
              Process
            </button>
          </div>
        )}
      </div>
    </div>
  );
}