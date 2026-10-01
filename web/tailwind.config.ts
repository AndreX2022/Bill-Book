import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1B2A4A",
          light: "#5B6472",
        },
        paper: {
          DEFAULT: "#FAFAF8",
          card: "#FFFFFF",
          border: "#E4E1DA",
        },
        stamp: {
          red: "#B23A3A",
          green: "#2F6F4E",
          amber: "#A9720C",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
