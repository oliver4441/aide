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
        // Newsprint palette — warm off-white ground and near-black ink.
        ground: "rgb(var(--dp-color-ground-rgb) / <alpha-value>)",
        ink: "rgb(var(--dp-color-ink-rgb) / <alpha-value>)",
        secondary: "rgb(var(--dp-color-secondary-rgb) / <alpha-value>)",
        rule: "rgb(var(--dp-color-rule-rgb) / <alpha-value>)",
        accent: "rgb(var(--dp-color-accent-rgb) / <alpha-value>)",

        // Functional colours for errors/success/states (not thematic).
        error: "rgb(var(--dp-color-error-rgb) / <alpha-value>)",
        success: "rgb(var(--dp-color-success-rgb) / <alpha-value>)",
        warning: "rgb(var(--dp-color-warning-rgb) / <alpha-value>)",
        danger: "rgb(var(--dp-color-danger-rgb) / <alpha-value>)",
      },
      fontFamily: {
        // Mastheads, headlines, labels and controls.
        display: ["var(--dp-typography-display)", "Georgia", "Times New Roman", "serif"],
        // Body copy and quotations.
        reading: ["var(--dp-typography-reading)", "Georgia", "Times New Roman", "serif"],
      },
      fontSize: {
        // Newsprint-specific steps. The default xs→9xl scale is kept.
        body: ["var(--dp-typography-body)", { lineHeight: "var(--dp-typography-body-leading)" }],
        "reading-compact": [
          "var(--dp-typography-reading-compact)",
          { lineHeight: "var(--dp-typography-body-leading)" },
        ],
        label: [
          "var(--dp-typography-label)",
          { lineHeight: "var(--dp-typography-control-leading)", letterSpacing: "var(--dp-typography-label-tracking)" },
        ],
        control: ["var(--dp-typography-control)", { lineHeight: "var(--dp-typography-control-leading)" }],
      },
      borderRadius: {
        // Square controls; `rounded-full` stays available for spinners/dots.
        control: "var(--dp-radius-control)",
      },
      screens: {
        // Newsprint breakpoints, in addition to sm/md/lg/xl/2xl.
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
      boxShadow: {
        // Newsprint is flat: every shadow utility resolves to nothing so legacy
        // `shadow-*` classes cannot reintroduce depth.
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
      },
      transitionDuration: {
        DEFAULT: "0ms",
      },
    },
  },
  plugins: [],
}

export default config
