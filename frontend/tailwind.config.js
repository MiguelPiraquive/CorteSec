/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Clases dinámicas usadas en NotificacionesPage (categorías y stats)
    {
      pattern: /bg-(indigo|emerald|blue|violet|cyan|amber|rose|red|gray|green)-(100|200|500|600)/,
      variants: [],
    },
    {
      pattern: /text-(indigo|emerald|blue|violet|cyan|amber|rose|red|gray|green)-(600|700)/,
      variants: [],
    },
    {
      pattern: /from-(indigo|emerald|blue|violet|cyan|amber|rose|red|gray|green)-500/,
      variants: [],
    },
    {
      pattern: /from-(indigo|emerald|blue|violet|cyan|amber|rose|red|gray|green)-500\/10/,
      variants: [],
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Satoshi', 'system-ui', 'sans-serif'],
        body: ['General Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        dark: {
          950: '#050810',
          900: '#0A0E1A',
          800: '#111827',
          700: '#1A1F2E',
          600: '#242938',
          500: '#2E3447',
        },
        electric: {
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
        },
        accent: {
          400: '#A78BFA',
          500: '#7C3AED',
          600: '#6D28D9',
        },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'slide-up': 'slide-up 0.6s ease-out forwards',
        'slide-up-delay-1': 'slide-up 0.6s ease-out 0.1s forwards',
        'slide-up-delay-2': 'slide-up 0.6s ease-out 0.2s forwards',
        'slide-up-delay-3': 'slide-up 0.6s ease-out 0.3s forwards',
        'fade-in-slow': 'fade-in 1s ease-out forwards',
        'scale-in-slow': 'scale-in 0.5s ease-out forwards',
        'glow-line': 'glow-line 3s ease-in-out infinite',
      },
      keyframes: {
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59,130,246,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(59,130,246,0.6)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-line': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
