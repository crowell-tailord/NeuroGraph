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
        background: '#08090c',
        card: '#0f1117',
        'card-foreground': '#f3f4f6',
        border: '#1f2430',
        tactical: {
          red: '#f43f5e',
          amber: '#f59e0b',
          cyan: '#06b6d4',
          emerald: '#10b981',
          purple: '#a855f7',
          dim: '#64748b',
          grid: 'rgba(255, 255, 255, 0.04)',
          gridLine: 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Geist Mono', 'SF Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
