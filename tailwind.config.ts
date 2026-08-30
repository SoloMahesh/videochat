import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--color-bg)",
        surface: "var(--color-surface-1)",
        "surface-2": "var(--color-surface-2)",
        "surface-3": "var(--color-surface-3)",
        "surface-hover": "var(--color-surface-hover)",
        ink: "var(--color-text-1)",
        "ink-muted": "var(--color-text-2)",
        "ink-faint": "var(--color-text-3)",
        line: "var(--color-border-subtle)",
        "line-strong": "var(--color-border-strong)",
        accent: {
          DEFAULT: "var(--color-hero-500)",
          300: "var(--color-hero-300)",
          400: "var(--color-hero-400)",
          500: "var(--color-hero-500)",
          600: "var(--color-hero-600)",
          700: "var(--color-hero-700)",
          deep: "var(--color-hero-deep)",
          ink: "var(--color-hero-400)",
          soft: "var(--color-hero-soft)",
          ontext: "var(--color-text-on-accent)",
        },
        accent2: {
          DEFAULT: "var(--color-highlight-500)",
          300: "var(--color-highlight-300)",
          400: "var(--color-highlight-400)",
          500: "var(--color-highlight-500)",
          600: "var(--color-highlight-600)",
          soft: "var(--color-highlight-soft)",
        },
        danger: "var(--color-danger)",
        info: "var(--color-info)",
      },
      boxShadow: {
        flat: "0 0 0 1px var(--color-border-subtle)",
        "extrude-sm": "2px 2px 6px var(--color-shadow-cast), -2px -2px 6px var(--color-shadow-lift)",
        "extrude-md": "4px 4px 12px var(--color-shadow-cast), -3px -3px 10px var(--color-shadow-lift)",
        "extrude-lg": "8px 8px 22px var(--color-shadow-cast), -6px -6px 18px var(--color-shadow-lift)",
        "inset-sm": "inset 2px 2px 5px var(--color-shadow-cast), inset -2px -2px 5px var(--color-shadow-lift)",
        "inset-md": "inset 4px 4px 9px var(--color-shadow-cast), inset -3px -3px 7px var(--color-shadow-lift)",
        "glass-rim": "inset 0 1px 0 var(--color-glass-rim), 0 8px 24px rgba(0,0,0,0.18)",
      },
      fontFamily: {
        // One family, weight does the work (Soft Extrusion typography
        // principle) — display reuses the body face rather than pairing
        // in a second typeface.
        display: ["var(--font-body)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs2: "0.375rem",
        sm2: "0.625rem",
        md2: "0.875rem",
        xl2: "1.375rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
      transitionTimingFunction: {
        out2: "cubic-bezier(0.22, 1, 0.36, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
