/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aviation-themed palette
        'sky': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Aircraft type colors
        'helicopter': '#ef4444',  // Red
        'jet': '#3b82f6',         // Blue
        'fixed-wing': '#22c55e',  // Green
        'curfew': '#f97316',      // Orange for curfew violations
      },
      borderRadius: {
        // Sharp edges per user preference
        'none': '0',
        DEFAULT: '0',
        'sm': '0',
        'md': '0',
        'lg': '0',
        'xl': '0',
        '2xl': '0',
        '3xl': '0',
        'full': '0',
      },
    },
  },
  plugins: [],
}
