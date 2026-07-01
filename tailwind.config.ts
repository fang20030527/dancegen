import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#090907",
        studio: "#11110f",
        chalk: "#f4f2ec",
        paper: "#fffdf7",
        acid: "#ccff00",
        coral: "#ff6b55",
        cobalt: "#2f5bff",
        moss: "#45624e",
      },
      boxShadow: {
        "studio-soft": "0 24px 70px rgba(9, 9, 7, 0.16)",
        "acid-ring": "0 0 0 1px rgba(204, 255, 0, 0.35), 0 18px 50px rgba(204, 255, 0, 0.12)",
      },
      keyframes: {
        "pulse-frame": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.74" },
          "50%": { transform: "scale(1.03)", opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-frame": "pulse-frame 3.4s ease-in-out infinite",
        "slide-up": "slide-up 0.7s ease-out both",
      },
    },
  },
  plugins: [typography],
};

export default config;
