"use client";

import { useState } from "react";
import Link from "next/link";
import ThemePicker from "./ThemePicker";
import { useAuth } from "../lib/useAuth";

export default function NavBar({ onAddPlaylist }) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ThemePicker />

        <Link href="/" className="navbar-brand" onClick={close}>
          <span>TrackTube</span>
        </Link>
      </div>

      <button
        className="navbar-hamburger"
        aria-label="Toggle menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        {menuOpen ? "✕" : "≡"}
      </button>

      <div className="navbar-actions">
        <Link href="/about" className="btn">
          About
        </Link>
        {loading ? null : user ? (
          <>
            <Link href="/playlists" className="btn">
              Your playlists
            </Link>
            {onAddPlaylist && (
              <button className="btn btn-primary" onClick={onAddPlaylist}>
                + Add playlist
              </button>
            )}
            <button className="btn" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-primary">
              Login first
            </Link>
            <Link href="/register" className="btn">
              Register
            </Link>
          </>
        )}
      </div>

      {menuOpen && (
        <nav className="navbar-menu">
          <Link href="/about" className="btn btn-block" onClick={close}>
            About
          </Link>

          {loading ? null : user ? (
            <>
              <Link href="/playlists" className="btn btn-block" onClick={close}>
                Your playlists
              </Link>
              {onAddPlaylist && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    close();
                    onAddPlaylist();
                  }}
                >
                  + Add playlist
                </button>
              )}
              <button className="btn btn-block" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-primary btn-block" onClick={close}>
                Login first
              </Link>
              <Link href="/register" className="btn btn-block" onClick={close}>
                Register
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}