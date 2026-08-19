"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";
import { useAuth } from "../lib/useAuth";

const BLOCK_COLORS = [
  "var(--accent)",
  "var(--success)",
  "var(--danger)",
  "var(--border)",
  "var(--muted)",
];

export default function Home() {
  const { user, loading } = useAuth();
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    setBlocks(
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 24,
        duration: 8 + Math.random() * 16,
        delay: -Math.random() * 20,
        color: BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)],
        sway: 20 + Math.random() * 70,
        opacity: 0.4 + Math.random() * 0.6,
      }))
    );
  }, []);

  const features = [
    ["➕", "Paste any playlist", "Drop a YouTube playlist link — metadata is streamed in server-side via yt-dlp with a live progress bar."],
    ["⏱️", "Live totals", "Mark videos and watch marked time, time left and progress % update instantly."],
    ["🗄️", "Private cloud", "Account-bound storage on Supabase — your playlists, videos and progress stay yours."],
    ["📊", "Analytics", "Donut chart, longest-videos breakdown, marked vs remaining stats per playlist."],
    ["🎨", "10 themes", "CRT Green, Ocean, Blood, Candy and more — pick your pixel palette."],
    ["🔍", "Search & filter", "Find any video by title, tab through All / Marked / Not marked."],
  ];

  return (
    <div className="page page-scroll">
      <div className="pixel-bg" aria-hidden>
        {blocks.map((b) => (
          <span
            key={b.id}
            className="pixel-block"
            style={{
              left: `${b.left}%`,
              width: b.size,
              height: b.size,
              background: b.color,
              opacity: b.opacity,
              animationDuration: `${b.duration}s`,
              animationDelay: `${b.delay}s`,
              "--sway": `${b.sway}px`,
            }}
          />
        ))}
      </div>

      <NavBar />

      <main className="container">
        <section className="hero">
          <div className="hero-logo" aria-hidden>
            ▓
          </div>
          <h1 className="hero-title">TRACKTUBE</h1>
          <p className="hero-sub">
            Mark videos, watch your progress climb — across any YouTube playlist,
            in glorious 8-bit.
          </p>
          <div className="hero-ctas">
            {loading ? null : user ? (
              <Link href="/playlists" className="btn btn-primary btn-lg">
                Your playlists →
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn btn-primary btn-lg">
                  Get started
                </Link>
                <Link href="/login" className="btn btn-lg">
                  Log in
                </Link>
              </>
            )}
          </div>
          <div className="hero-glyphs" aria-hidden>
            <span>▓</span>
            <span>▒</span>
            <span>░</span>
            <span>█</span>
            <span>▄</span>
            <span>▀</span>
            <span>▐</span>
            <span>▌</span>
          </div>
        </section>

        <div className="marquee" aria-hidden>
          <div className="marquee-track">
            <span className="marquee-text">
              TRACKTUBE ▓ PASTE A PLAYLIST ▒ MARK VIDEOS ░ WATCH PROGRESS ▐ 8-BIT ENERGY ▌ 10
              THEMES ▄ PRIVATE CLOUD ▀ TRACK ANY PLAYLIST █
            </span>
            <span className="marquee-text" aria-hidden>
              TRACKTUBE ▓ PASTE A PLAYLIST ▒ MARK VIDEOS ░ WATCH PROGRESS ▐ 8-BIT ENERGY ▌ 10
              THEMES ▄ PRIVATE CLOUD ▀ TRACK ANY PLAYLIST █
            </span>
          </div>
        </div>

        <section className="landing-section">
          <h2 className="side-section-title">What is TrackTube?</h2>
          <p className="landing-text">
            Pick any YouTube playlist you're watching through, mark videos as you finish
            them, and always know exactly how much time you've invested and how much is
            left. Create a free account and everything is saved to your own private
            Supabase cloud — sign out and nothing of yours is ever leaked.
          </p>
        </section>

        <section className="landing-section">
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

        <section className="landing-section">
          <h2 className="side-section-title">How it works</h2>
          <div className="how-grid">
            <div className="how-step">
              <span className="how-step-num">01</span>
              <h3>Paste</h3>
              <p>Any YouTube playlist link — a live progress bar streams while metadata is fetched.</p>
            </div>
            <div className="how-step">
              <span className="how-step-num">02</span>
              <h3>Mark</h3>
              <p>Click videos you've finished. Totals, percentages and time left update instantly.</p>
            </div>
            <div className="how-step">
              <span className="how-step-num">03</span>
              <h3>Pick up where you left off</h3>
              <p>Progress lives in your account, so it syncs across browsers and devices.</p>
            </div>
          </div>
        </section>

        <section className="landing-section landing-cta">
          <h2 className="side-section-title">Ready to track?</h2>
          {loading ? (
            <p className="landing-text">Loading…</p>
          ) : user ? (
            <Link href="/playlists" className="btn btn-primary btn-lg">
              Open your playlists →
            </Link>
          ) : (
            <div className="hero-ctas">
              <Link href="/register" className="btn btn-primary btn-lg">
                Create free account
              </Link>
              <Link href="/login" className="btn btn-lg">
                Log in
              </Link>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}