import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        poet: {
          bg: "#0a0608",
          surface: "#141018",
          gold: "#c5a059",
          "gold-bright": "#e8d48b",
          "gold-dim": "#8a7344",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        gold: "0 0 24px -4px rgba(197, 160, 89, 0.35)",
        "gold-sm": "0 0 16px -6px rgba(197, 160, 89, 0.28)",
      },
      keyframes: {
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(197, 160, 89, 0.25)" },
          "50%": { borderColor: "rgba(232, 212, 139, 0.45)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "border-glow": "border-glow 4s ease-in-out infinite",
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
