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
        navy: {
          50: "#eef4ff",
          100: "#dce9ff",
          500: "#1f5eff",
          700: "#153bb7",
          900: "#08152f",
          950: "#040b1d"
        },
        royal: {
          500: "#2563eb",
          700: "#1d4ed8"
        },
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
        soft: "0 18px 60px rgba(18, 48, 38, 0.12)",
        premium: "0 22px 80px rgba(4, 11, 29, 0.16), 0 8px 24px rgba(21, 59, 183, 0.08)",
        glow: "0 0 0 1px rgba(215, 171, 61, 0.18), 0 18px 48px rgba(8, 21, 47, 0.14)",
        glass: "0 20px 70px rgba(4, 11, 29, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.45)"
      }
    }
  },
  plugins: []
};
