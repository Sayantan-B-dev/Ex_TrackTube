export const THEME_STORAGE_KEY = "tracktube:theme";
export const DEFAULT_THEME = "crt-green";

export const THEMES = [
  { id: "crt-green", name: "CRT Green", swatch: "#4ade80" },
  { id: "sunset", name: "Sunset", swatch: "#fb923c" },
  { id: "ocean", name: "Ocean", swatch: "#38bdf8" },
  { id: "blood", name: "Blood", swatch: "#ef4444" },
  { id: "forest", name: "Forest", swatch: "#22c55e" },
  { id: "purple-haze", name: "Purple Haze", swatch: "#a78bfa" },
  { id: "mono", name: "Mono", swatch: "#e8e8e8" },
  { id: "candy", name: "Candy", swatch: "#f472b6" },
  { id: "ember", name: "Ember", swatch: "#f97316" },
  { id: "night-blue", name: "Night Blue", swatch: "#60a5fa" },
];

export function loadTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(id) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}