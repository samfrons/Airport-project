/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'helicopter': '#f87171',
        'jet': '#60a5fa',
        'fixed-wing': '#34d399',
        'curfew': '#f59e0b',
        // Semantic surface colors
        surface: 'var(--bg-surface)',
        page: 'var(--bg-page)',
        raised: 'var(--bg-raised)',
        inset: 'var(--bg-inset)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        muted: 'var(--text-muted)',
      },
      borderColor: {
        subtle: 'var(--border-subtle)',
        strong: 'var(--border-strong)',
      },
      backgroundColor: {
        surface: 'var(--bg-surface)',
        page: 'var(--bg-page)',
        raised: 'var(--bg-raised)',
        inset: 'var(--bg-inset)',
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
};
