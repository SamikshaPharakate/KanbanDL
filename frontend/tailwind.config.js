/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a',
        darkSurface: '#1e293b',
        glassBg: 'rgba(15, 23, 42, 0.6)',
        glassBorder: 'rgba(255, 255, 255, 0.08)',
        indigoGlow: '#6366f1',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
