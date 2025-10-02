/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./static/**/*.{js,jsx,ts,tsx}"
  ],
  safelist: [
    // Dynamic classes used in filters and components
    'text-blue-600', 'text-orange-600', 'text-green-600', 'text-purple-600', 'text-emerald-600',
    'text-blue-700', 'text-orange-700', 'text-green-700', 'text-purple-700', 'text-emerald-700',
    'text-blue-300', 'text-orange-300', 'text-green-300', 'text-purple-300', 'text-emerald-300',
    'bg-blue-100', 'bg-orange-100', 'bg-green-100', 'bg-purple-100', 'bg-emerald-100',
    'bg-blue-900/20', 'bg-orange-900/20', 'bg-green-900/20', 'bg-purple-900/20', 'bg-emerald-900/20',
    'focus:ring-blue-500', 'focus:ring-orange-500', 'focus:ring-green-500', 'focus:ring-purple-500',
    'hover:bg-blue-200', 'hover:bg-orange-200', 'hover:bg-green-200', 'hover:bg-purple-200', 'hover:bg-emerald-200',
    'hover:bg-blue-900/50', 'hover:bg-orange-900/50', 'hover:bg-green-900/50', 'hover:bg-purple-900/50', 'hover:bg-emerald-900/50'
  ],
  theme: {
    extend: {
      backdropBlur: {
        '3xl': '64px',
        '4xl': '128px'
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
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
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
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ],
  darkMode: 'class'
};
