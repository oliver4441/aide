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
    extend: {
      colors: {
        ground: "rgb(var(--dp-color-ground-rgb) / <alpha-value>)",
        surface: "rgb(var(--dp-color-surface-rgb) / <alpha-value>)",
        ink: "rgb(var(--dp-color-ink-rgb) / <alpha-value>)",
        secondary: "rgb(var(--dp-color-secondary-rgb) / <alpha-value>)",
        muted: "rgb(var(--dp-color-muted-rgb) / <alpha-value>)",
        rule: "rgb(var(--dp-color-rule-rgb) / <alpha-value>)",
        accent: "rgb(var(--dp-color-accent-rgb) / <alpha-value>)",

        // shadcn compatibility aliases. These are aliases, not new colours: every
        // one resolves to an existing Newsprint token so generated shadcn
        // components (and the copied hero) render in the same palette.
        background: "rgb(var(--dp-color-ground-rgb) / <alpha-value>)",
        foreground: "rgb(var(--dp-color-ink-rgb) / <alpha-value>)",
        card: "rgb(var(--dp-color-surface-rgb) / <alpha-value>)",
        border: "rgb(var(--dp-color-rule-rgb) / <alpha-value>)",
        "muted-foreground": "rgb(var(--dp-color-secondary-rgb) / <alpha-value>)",

        // Keep functional colors for errors/success (not thematic)
        error: "#ba1a1a",
        "error-container": "#ffe0d6",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#e11d48",
      },
      fontFamily: {
        display: ["var(--dp-typography-display)", "sans-serif"],
        reading: ["var(--dp-typography-reading)", "sans-serif"],
      },
      fontSize: {
        body: ["16px", { lineHeight: "1.55" }],
        "reading-compact": ["15px", { lineHeight: "1.5" }],
        label: ["12px", { lineHeight: "1.2", letterSpacing: "0.09em" }],
        control: ["15px", { lineHeight: "1.2" }],
      },
      borderRadius: {
        control: "var(--dp-radius-control)",
      },
      screens: {
        wp: "700px",
        np: "1100px",
      },
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