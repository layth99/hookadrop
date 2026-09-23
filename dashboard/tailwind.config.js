/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFA500',
          dark: '#B8860B',
        },
        neon: {
          blue: '#00D9FF',
          cyan: '#00BFFF',
          gold: '#FFD700',
          orange: '#FFA500',
        },
      },
      boxShadow: {
        'neon-blue': '0 0 10px #00D9FF, 0 0 20px #00D9FF',
        'neon-gold': '0 0 10px #FFD700, 0 0 20px #FFD700',
        'glow': '0 0 15px rgba(255, 215, 0, 0.5)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          'from': { boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD700' },
          'to': { boxShadow: '0 0 20px #FFD700, 0 0 30px #FFD700, 0 0 40px #FFD700' },
        },
      },
    },
  },
  plugins: [],
}
