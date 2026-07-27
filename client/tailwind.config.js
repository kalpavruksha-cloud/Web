/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Manrope", "Inter", "ui-sans-serif", "system-ui"]
      },
      colors: {
        forest: {
          50: "#edf7f1",
          100: "#d6ecde",
          500: "#1e7b54",
          700: "#14583f",
          900: "#0b2f25"
        },
        gold: {
          100: "#f8edc8",
          400: "#d7ab3d",
          600: "#a97a16"
        },
        ivory: "#fbfaf4",
        charcoal: "#202421"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(18, 48, 38, 0.12)"
      }
    }
  },
  plugins: []
};
