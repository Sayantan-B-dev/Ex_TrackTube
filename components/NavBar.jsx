"use client";

import Link from "next/link";
import ThemePicker from "./ThemePicker";

export default function NavBar({ onAddPlaylist }) {
  return (
    <header className="navbar">
      <Link href="/" className="navbar-brand">
        <span className="navbar-logo" aria-hidden>
          ▓
        </span>
        <span>TrackTube</span>
      </Link>
      <div className="navbar-actions">
        <ThemePicker />
        <button className="btn btn-primary" onClick={onAddPlaylist}>
          + Add playlist
        </button>
      </div>
    </header>
  );
}