import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#e6edf5",
          100: "#b3c4dc",
          200: "#809bc3",
          300: "#4d72aa",
          400: "#1a4991",
          500: "#003366",
          600: "#002952",
          700: "#001f3d",
          800: "#001429",
          900: "#000a14",
        },
        amber: {
          adr: "#FFC200",
        },
        hazard: "#CC0000",
        "safe-green": "#00843D",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
