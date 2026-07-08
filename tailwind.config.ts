import type { Config } from "tailwindcss";

const n = (shade: string) => `rgb(var(--n-${shade}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Neutral scale is backed by CSS vars so a single class set works in
        // both themes — light mode just inverts the scale (see globals.css).
        neutral: {
          50: n("50"), 100: n("100"), 200: n("200"), 300: n("300"), 400: n("400"),
          500: n("500"), 600: n("600"), 700: n("700"), 800: n("800"), 900: n("900"), 950: n("950"),
        },
        white: n("white"),
        accent: {
          DEFAULT: "#e5e5e5",
          hover: "#fafafa",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
