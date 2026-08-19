"use client";

import Link from "next/link";
import ThemePicker from "./ThemePicker";
import { useAuth } from "../lib/useAuth";

export default function NavBar({ onAddPlaylist }) {
  const { user, loading, logout } = useAuth();

  return (
    <header className="navbar">
      <Link href="/" className="navbar-brand">
        <span className="navbar-logo" aria-hidden>
          ▓
        </span>
        <span>TrackTube</span>
      </Link>
      <div className="navbar-actions">
        <Link href="/about" className="btn">
          About
        </Link>
        <ThemePicker />
        {loading ? null : user ? (
          <>
            <span className="nav-user" title={user.username}>
              ▸ {user.username}
            </span>
            <button className="btn" onClick={logout}>
              Log out
            </button>
            {onAddPlaylist && (
              <button className="btn btn-primary" onClick={onAddPlaylist}>
                + Add playlist
              </button>
            )}
          </>
        ) : (
          <>
            <Link href="/login" className="btn">
              Log in
            </Link>
            <Link href="/register" className="btn btn-primary">
              Register
            </Link>
            {onAddPlaylist && (
              <button className="btn" onClick={onAddPlaylist}>
                + Add playlist
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
}