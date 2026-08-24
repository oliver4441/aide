import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          light: "rgb(var(--primary-light) / <alpha-value>)",
          container: "rgb(var(--primary-container) / <alpha-value>)",
          dark: "#5a1f42",
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          dim: "rgb(var(--surface-dim) / <alpha-value>)",
          bright: "rgb(var(--surface-bright) / <alpha-value>)",
          plum: "rgb(var(--surface-plum) / <alpha-value>)",
        },
        "surface-container": {
          DEFAULT: "rgb(var(--surface-container) / <alpha-value>)",
          low: "rgb(var(--surface-container-low) / <alpha-value>)",
          lowest: "rgb(var(--surface-container-lowest) / <alpha-value>)",
          high: "rgb(var(--surface-container-high) / <alpha-value>)",
          highest: "rgb(var(--surface-container-highest) / <alpha-value>)",
        },
        "on-surface": {
          DEFAULT: "rgb(var(--on-surface) / <alpha-value>)",
          variant: "rgb(var(--on-surface-variant) / <alpha-value>)",
        },
        outline: {
          DEFAULT: "rgb(var(--outline) / <alpha-value>)",
          variant: "rgb(var(--outline-variant) / <alpha-value>)",
        },
        error: {
          DEFAULT: "rgb(var(--error) / <alpha-value>)",
          container: "rgb(var(--error-container) / <alpha-value>)",
        },
        "on-error-container": "rgb(var(--on-error-container) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
      },
      fontFamily: {
        headline: ["var(--font-headline)", "Manrope", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
export default config
