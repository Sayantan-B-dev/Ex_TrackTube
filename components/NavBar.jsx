"use client";

import { useState } from "react";
import Link from "next/link";
import ThemePicker from "./ThemePicker";
import { useAuth } from "../lib/useAuth";

export default function NavBar({ onAddPlaylist }) {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <Link href="/" className="navbar-brand" onClick={close}>
        <span className="navbar-logo" aria-hidden>
          ▓
        </span>
        <span>TrackTube</span>
      </Link>

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
        <ThemePicker />
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
            <span className="nav-user" title={user.username}>
              ▸ {user.username}
            </span>
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
          <div className="navbar-menu-theme">
            <ThemePicker />
          </div>
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
              <span className="nav-user" title={user.username}>
                ▸ {user.username}
              </span>
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