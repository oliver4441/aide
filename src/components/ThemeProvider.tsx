"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";
export type Accent =
  | "plum"
  | "ocean"
  | "forest"
  | "sunrise"
  | "graphite"
  | "violet"
  | "rose"
  | "teal"
  | "gold"
  | "crimson"
  | "indigo";

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
  { id: "violet", label: "Violet", color: "#6d28d9" },
  { id: "rose", label: "Rose", color: "#e11d48" },
  { id: "teal", label: "Teal", color: "#0d9488" },
  { id: "gold", label: "Gold", color: "#b45309" },
  { id: "crimson", label: "Crimson", color: "#dc2626" },
  { id: "indigo", label: "Indigo", color: "#4f46e5" },
];

/**
 * Optional page backgrounds offered in Settings → Appearance. Each preset is
 * pure CSS (no downloads), painted by a fixed layer behind the app (see
 * BackgroundLayer + globals.css). `art` is the gradient stack used both by
 * globals.css and the picker swatches.
 */
export type Background =
  | "none"
  | "aurora"
  | "sunset"
  | "ocean-depths"
  | "forest-mist"
  | "slate"
  | "rose-dawn"
  | "custom";

export const BACKGROUNDS: { id: Exclude<Background, "none" | "custom">; label: string; art: string }[] = [
  {
    id: "aurora",
    label: "Aurora",
    art: "radial-gradient(900px 600px at 85% -10%, rgba(167,139,250,.55), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(52,211,153,.45), transparent 60%), linear-gradient(135deg, #0f172a, #1e1b4b)",
  },
  {
    id: "sunset",
    label: "Sunset",
    art: "radial-gradient(900px 600px at 80% -10%, rgba(251,146,60,.55), transparent 60%), radial-gradient(800px 600px at 10% 110%, rgba(244,63,94,.45), transparent 60%), linear-gradient(135deg, #1c1917, #431407)",
  },
  {
    id: "ocean-depths",
    label: "Ocean Depths",
    art: "radial-gradient(900px 600px at 85% -10%, rgba(56,189,248,.5), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(30,64,175,.55), transparent 60%), linear-gradient(135deg, #082f49, #0c4a6e)",
  },
  {
    id: "forest-mist",
    label: "Forest Mist",
    art: "radial-gradient(900px 600px at 85% -10%, rgba(134,239,172,.4), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(20,184,166,.4), transparent 60%), linear-gradient(135deg, #0f1f1a, #14532d)",
  },
  {
    id: "slate",
    label: "Slate",
    art: "radial-gradient(900px 600px at 85% -10%, rgba(148,163,184,.35), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(100,116,139,.35), transparent 60%), linear-gradient(135deg, #0f172a, #334155)",
  },
  {
    id: "rose-dawn",
    label: "Rose Dawn",
    art: "radial-gradient(900px 600px at 85% -10%, rgba(251,113,133,.5), transparent 60%), radial-gradient(800px 600px at -10% 100%, rgba(192,132,252,.45), transparent 60%), linear-gradient(135deg, #1f1117, #500724)",
  },
];

const BACKGROUND_IDS = new Set(BACKGROUNDS.map((b) => b.id));

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

/**
 * Applies the chosen page background to <html>. Presets are referenced by
 * `data-bg` (art lives in globals.css); a custom photo is injected inline as
 * `--app-bg-art` so the data URL never has to live in a stylesheet.
 */
function applyBackground(background: Background, customDataUrl?: string | null) {
  const el = document.documentElement;
  if (background === "custom" && customDataUrl) {
    el.style.setProperty("--app-bg-art", `url("${customDataUrl}")`);
    el.setAttribute("data-bg", "custom");
  } else if (background !== "none" && BACKGROUND_IDS.has(background as never)) {
    el.style.removeProperty("--app-bg-art");
    el.setAttribute("data-bg", background);
  } else {
    el.style.removeProperty("--app-bg-art");
    el.removeAttribute("data-bg");
  }
}

interface ThemeContextValue {
  theme: Theme;
  accent: Accent;
  background: Background;
  customBackground: string | null;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setBackground: (b: Background) => void;
  setCustomBackground: (dataUrl: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("plum");
  const [background, setBackgroundState] = useState<Background>("none");
  const [customBackground, setCustomBackgroundState] = useState<string | null>(null);
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

    const storedBackground = localStorage.getItem("aide_background") as Background | null;
    const storedCustom = localStorage.getItem("aide_background_custom");
    const initialBackground: Background =
      storedBackground === "custom" && storedCustom
        ? "custom"
        : storedBackground && (BACKGROUND_IDS.has(storedBackground as never) || storedBackground === "none")
          ? storedBackground
          : "none";
    setBackgroundState(initialBackground);
    setCustomBackgroundState(storedCustom);
    applyBackground(initialBackground, storedCustom);

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

  const setBackground = useCallback((b: Background) => {
    setBackgroundState(b);
    if (b === "custom") {
      localStorage.setItem("aide_background", "custom");
    } else {
      localStorage.setItem("aide_background", b);
    }
    applyBackground(b, customBackground);
  }, [customBackground]);

  const setCustomBackground = useCallback((dataUrl: string | null) => {
    setCustomBackgroundState(dataUrl);
    if (dataUrl) {
      localStorage.setItem("aide_background_custom", dataUrl);
      setBackgroundState("custom");
      localStorage.setItem("aide_background", "custom");
      applyBackground("custom", dataUrl);
    } else {
      localStorage.removeItem("aide_background_custom");
      // Fall back to no background when the custom photo is removed.
      setBackgroundState("none");
      localStorage.setItem("aide_background", "none");
      applyBackground("none", null);
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, accent, background, customBackground, toggle, setTheme, setAccent, setBackground, setCustomBackground }}
    >
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
      background: "none",
      customBackground: null,
      toggle: () => {},
      setTheme: () => {},
      setAccent: () => {},
      setBackground: () => {},
      setCustomBackground: () => {},
    };
  }
  return ctx;
}
