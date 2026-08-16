"use client";

import Link from "next/link";

export default function NavBar({ onAddPlaylist }) {
  return (
    <header className="navbar">
      <Link href="/" className="navbar-brand">
        <span className="navbar-logo" aria-hidden>
          ▓
        </span>
        <span>TrackTube</span>
      </Link>
      <button className="btn btn-primary" onClick={onAddPlaylist}>
        + Add playlist
      </button>
    </header>
  );
}