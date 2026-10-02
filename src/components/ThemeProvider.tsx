"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";
export type Accent = "plum" | "ocean" | "forest" | "sunrise" | "graphite";

/**
 * Accent palettes offered in Settings → Appearance.
 *
 * Each accent overrides only the `--primary` trio of CSS variables via a
 * `data-theme` attribute on <html> (see globals.css); surfaces, text and
 * outlines stay shared, so every palette works in both light and dark mode.
 * `color` is the light-mode swatch hex used in the picker and the browser UI.
 */
export const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: "plum", label: "Plum", color: "#6f264f" },
  { id: "ocean", label: "Ocean", color: "#2563eb" },
  { id: "forest", label: "Forest", color: "#166534" },
  { id: "sunrise", label: "Sunrise", color: "#ea580c" },
  { id: "graphite", label: "Graphite", color: "#374151" },
];

const ACCENT_IDS = new Set(ACCENTS.map((a) => a.id));
const DEFAULT_ACCENT_COLOR = ACCENTS[0].color;

function applyAccent(accent: Accent) {
  const el = document.documentElement;
  if (accent === "plum") {
    el.removeAttribute("data-theme");
  } else {
    el.setAttribute("data-theme", accent);
  }
  // Keep the browser UI (PWA status bar, taskbar tile) tinted with the accent.
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", ACCENTS.find((a) => a.id === accent)?.color ?? DEFAULT_ACCENT_COLOR);
  });
}

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("plum");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial: Theme =
      stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setThemeState(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");

    const storedAccent = localStorage.getItem("accent") as Accent | null;
    const initialAccent: Accent = storedAccent && ACCENT_IDS.has(storedAccent) ? storedAccent : "plum";
    setAccentState(initialAccent);
    applyAccent(initialAccent);

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const next: Theme = e.matches ? "dark" : "light";
        setThemeState(next);
        document.documentElement.classList.toggle("dark", next === "dark");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mounted]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  const setAccent = useCallback((a: Accent) => {
    setAccentState(a);
    localStorage.setItem("accent", a);
    applyAccent(a);
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, accent, toggle, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "dark",
      accent: "plum",
      toggle: () => {},
      setTheme: () => {},
      setAccent: () => {},
    };
  }
  return ctx;
}
