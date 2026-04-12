/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#05060f',
          900: '#080918',
          800: '#0a0b1a',
          700: '#0d0e1f',
          600: '#111326',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        slate: {
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
