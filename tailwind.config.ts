import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f8ff",
          100: "#e6edff",
          200: "#c5d4ff",
          300: "#9db6ff",
          400: "#7597ff",
          500: "#4e78ff",
          600: "#2e5af5",
          700: "#1f44c4",
          800: "#1a3699",
          900: "#152b73"
        }
      }
    }
  },
  plugins: []
};

export default config;
