import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Each platform's chrome components override these with platform-specific stacks.
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Global neutrals only. Platform-specific palettes live in
        // components/platforms/<name>/design-tokens.ts and are applied via
        // inline styles / CSS variables at the mock layout level.
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#f6f7f8",
          muted: "#e5e7eb",
        },
      },
    },
  },
  plugins: [],
};

export default config;
