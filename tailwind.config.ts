import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        jerumi: {
          50: "#fff5f8",
          100: "#ffe4ee",
          200: "#ffc8dd",
          300: "#ffa3c9",
          400: "#ff7bb0",
          500: "#f7548f",
          600: "#e13a74",
          700: "#bb2a5c",
          800: "#8f2247",
          900: "#5e1730",
        },
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
