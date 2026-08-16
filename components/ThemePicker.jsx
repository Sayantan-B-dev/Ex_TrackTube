"use client";

import { useEffect, useRef, useState } from "react";
import { THEMES, loadTheme, saveTheme } from "../lib/themes";

export default function ThemePicker() {
  const [theme, setTheme] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setTheme(loadTheme());
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!theme) return null;
  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="theme-picker" ref={ref}>
      <button
        className="btn theme-picker-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="theme-swatch" style={{ background: current.swatch }} />
        <span className="theme-picker-name">{current.name}</span>
        <span aria-hidden>▼</span>
      </button>
      {open && (
        <div className="theme-menu" role="menu">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="menuitem"
              className={`theme-option${t.id === theme ? " theme-option-active" : ""}`}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            >
              <span className="theme-swatch" style={{ background: t.swatch }} />
              <span className="theme-option-name">{t.name}</span>
              {t.id === theme && <span className="theme-option-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}