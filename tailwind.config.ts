import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
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