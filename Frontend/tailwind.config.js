/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "brand": {
          DEFAULT: "#0F172A", // Deep Slate / Obsidian
          light: "#1E293B",
          dark: "#020617",
        },
        "accent": {
          DEFAULT: "#F5A623", // Premium Golden Amber
          light: "#FBCB73",
          dark: "#D98A12",
        },
        "surface": {
          DEFAULT: "#FFFFFF",
          muted: "#F8FAFC",
        }
      },
      fontFamily: {
        "headline": ["Outfit", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        "body": ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "card": "0 2px 8px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.03)",
        "card-hover": "0 8px 32px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(15, 23, 42, 0.04)",
        "nav": "0 4px 20px rgba(15, 23, 42, 0.03)",
        "premium": "0 10px 40px -10px rgba(245, 166, 35, 0.15)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "slide-down": "slide-down 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
}
