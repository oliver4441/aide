import type { Config } from "tailwindcss"

/**
 * Newsprint design system.
 *
 * IMPORTANT: every Newsprint token is added with `theme.extend`. The first pass
 * at this redesign replaced Tailwind's default scales outright
 * (`theme.fontSize`, `theme.borderRadius`, `theme.screens`, `theme.colors` …),
 * which silently deleted utilities the rest of the app still depends on:
 *
 *   - `text-xs/sm/base/lg/xl/…` stopped existing → every label, card title and
 *     headline inherited the 20px body size (headlines rendered smaller than
 *     body copy on some pages).
 *   - `md:` / `lg:` / `sm:` stopped existing → the desktop nav stayed `hidden`,
 *     the sidebar never appeared, grids stayed 1-column.
 *   - `rounded-*`, `shadow-*`, `font-mono` and `border-transparent` vanished →
 *     receipts printed in serif, focus/inactive borders picked up the default
 *     border colour.
 *   - `bg-accent/10`, `bg-ink/50`, `border-rule/60` produced *no CSS at all*,
 *     because colours declared as bare `var(--x)` cannot take an opacity
 *     modifier in Tailwind v3.
 *
 * Extending keeps the whole utility vocabulary alive while Newsprint drives the
 * actual look (palette, serif typography, square corners, flat surfaces).
 * Colours are declared as `rgb(var(--…-rgb) / <alpha-value>)` so opacity
 * modifiers work.
 */
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    colors: {
      // Newsprint palette — no semantic tokens, no plum/ocean/forest/sunset
      ground: "var(--dp-color-ground)",
      ink: "var(--dp-color-ink)",
      secondary: "var(--dp-color-secondary)",
      rule: "var(--dp-color-rule)",
      accent: "var(--dp-color-accent)",

      // Keep functional colors for errors/success (not thematic)
      error: "#ba1a1a",
      "error-container": "#ffe0d6",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#e11d48",
    },
    fontFamily: {
      display: ["var(--dp-typography-display)", "Georgia", "serif"],
      reading: ["var(--dp-typography-reading)", "Georgia", "serif"],
    },
    fontSize: {
      body: ["20px", { lineHeight: "1.3" }],
      "reading-compact": ["19px", { lineHeight: "1.3" }],
      label: ["12px", { lineHeight: "1.2", letterSpacing: "0.09em" }],
      control: ["15px", { lineHeight: "1.2" }],
    },
    borderRadius: {
      none: "0",
      control: "var(--dp-radius-control)",
    },
    boxShadow: {
      // Newsprint uses flat, square style — no shadows
      none: "none",
    },
    transitionProperty: {
      none: "none",
    },
    screens: {
      wp: "700px",
      np: "1100px",
    },
    extend: {
      spacing: {
        column: "var(--dp-spacing-column)",
        story: "var(--dp-spacing-story)",
      },
      borderWidth: {
        hairline: "var(--dp-border-hairline)",
        section: "var(--dp-border-section)",
      },
    },
  },
  plugins: [],
}

export default config