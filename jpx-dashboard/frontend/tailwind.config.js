/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aircraft type semantic colors
        'helicopter': '#f87171',
        'jet': '#60a5fa',
        'fixed-wing': '#34d399',
        'curfew': '#f59e0b',
      },
      borderRadius: {
        'none': '0',
        DEFAULT: '0',
        'sm': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
