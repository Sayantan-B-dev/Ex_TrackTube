"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import Footer from "../../components/Footer";
import AddPlaylistModal from "../../components/AddPlaylistModal";
import { useCore } from "../../lib/useCore";

export default function AboutPage() {
  const { playlists, ready } = useCore();
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !ready) {
    return (
      <div className="page">
        <NavBar onAddPlaylist={() => setModalOpen(true)} />
      </div>
    );
  }

  const features = [
    ["➕", "Any playlist", "Paste any YouTube playlist link — metadata is fetched server-side via yt-dlp with a live progress bar."],
    ["📊", "Analytics", "Animated donut, marked/unmarked split, total vs time-left stats and longest-videos breakdown."],
    ["⏱️", "Live totals", "Mark videos and watch marked time, time left and progress % update instantly."],
    ["🔐", "Accounts", "Register with a username, log in with bcrypt-hashed passwords and JWT sessions. Playlists live in Supabase with per-user access."],
    ["💾", "Cloud + local", "Logged in? Everything is saved to Supabase. Logged out? Falls back to your browser's localStorage."],
    ["🎨", "10 themes", "CRT Green, Ocean, Blood, Candy and more — pick your pixel palette from the nav bar."],
    ["🕹️", "Pixel art", "Press Start 2P & VT323 fonts, scanlines, hard shadows and stepped corners everywhere."],
    ["🔍", "Filters", "Search titles, view All / Marked / Not marked with live counts."],
    ["🛡️", "Rate limited", "One playlist fetch per hour per device — toggleable with RATE_LIMITING."],
  ];

  return (
    <div className="page page-scroll">
      <NavBar onAddPlaylist={() => setModalOpen(true)} />
      <AddPlaylistModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={() => {}} />

      <main className="container container-narrow">
        <div className="page-head">
          <h1>About TrackTube</h1>
          <p>A retro pixel-art progress tracker for YouTube playlists.</p>
        </div>

        <section className="about-section">
          <h2 className="side-section-title">What is TrackTube?</h2>
          <p className="about-text">
            TrackTube lets you pick any YouTube playlist you're watching through, mark
            videos as you finish them, and always know exactly how much time you've
            invested and how much is left. Log in to keep your playlists and progress
            in the cloud (Supabase) — or use it locally in your browser without an
            account.
          </p>
        </section>

        <section className="about-section">
          <h2 className="side-section-title">Features</h2>
          <div className="about-grid">
            {features.map(([icon, title, desc]) => (
              <div className="about-card" key={title}>
                <span className="about-icon">{icon}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="side-section-title">Tech stack</h2>
          <div className="about-badges">
            {["Next.js 15", "React 19", "yt-dlp", "Supabase", "bcrypt + JWT", "Press Start 2P", "VT323"].map((b) => (
              <span className="about-badge" key={b}>
                {b}
              </span>
            ))}
          </div>
        </section>

        <section className="about-section">
          <h2 className="side-section-title">Documentation</h2>
          <div className="about-links">
            <a href="docs/features.md" target="_blank" rel="noreferrer">Features</a>
            <a href="docs/technical.md" target="_blank" rel="noreferrer">Technical</a>
            <a href="docs/hld.md" target="_blank" rel="noreferrer">High-Level Design</a>
            <a href="docs/lld.md" target="_blank" rel="noreferrer">Low-Level Design</a>
            <a href="docs/problems-fixed.md" target="_blank" rel="noreferrer">Problems Fixed</a>
          </div>
        </section>

        <section className="about-section">
          <h2 className="side-section-title">Get started</h2>
          <p className="about-text">
            {playlists.length > 0
              ? `You already track ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}.`
              : "You're not tracking anything yet."}{" "}
            <Link href="/" className="about-inline-link">Open the dashboard</Link> or add a
            playlist right now.
          </p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
            + Add playlist
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}