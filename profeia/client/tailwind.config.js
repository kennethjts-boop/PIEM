/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#4285F4',
          red: '#EA4335',
          yellow: '#FBBC04',
          green: '#34A853',
          purple: '#A142F4',
          pink: '#FF6B9D',
        }
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        letterEntrance: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px) scale(0.5) rotate(-10deg)',
            filter: 'blur(4px)',
          },
          '60%': {
            transform: 'translateY(-3px) scale(1.1) rotate(2deg)',
            filter: 'blur(0)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1) rotate(0deg)',
            filter: 'blur(0)',
          },
        },
      },
    },
  },
  plugins: [],
}
