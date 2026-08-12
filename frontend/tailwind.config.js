/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f5fa',
          100: '#e1ecf4',
          200: '#c3dae9',
          300: '#95bed9',
          400: '#619cc4',
          500: '#3e81ad',
          600: '#2c6790',
          700: '#245275',
          800: '#204661',
          900: '#1e3a51',
          950: '#142536',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'ui-serif', 'serif'],
        serif:   ['"DM Serif Display"', '"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

