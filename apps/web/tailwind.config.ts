import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { navy: { 950: "#090b1c", 900: "#0e1128", 800: "#161a38", 700: "#222750" } },
      boxShadow: { card: "0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)" },
    },
  },
  plugins: [],
} satisfies Config;
