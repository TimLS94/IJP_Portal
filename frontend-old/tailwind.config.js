/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        // JobOn Brand Colors - Blau mit Power-Symbol Ästhetik
        primary: {
          50: '#f0f7fb',
          100: '#e0eff7',
          200: '#b8ddef',
          300: '#8ec9e5',
          400: '#5aafda',
          500: '#3B7CB8',  // JobOn Hauptfarbe
          600: '#3270a8',
          700: '#2a5c8c',
          800: '#244d73',
          900: '#1f4060',
        }
      }
    },
  },
  plugins: [],
}
