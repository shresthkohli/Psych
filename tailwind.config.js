/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        psych: {
          yellow: '#FFD400',
          black: '#101010',
          dark: '#1A1A1A',
          white: '#FFFFFF',
          mutedWhite: '#F5F5F0',
          red: '#E62429',
          grey: '#A3A3A3',
          cardBg: '#161616',
          borderDark: '#262626'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        comic: ['"Bungee"', '"Space Grotesk"', 'sans-serif'],
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px #FFD400',
        'brutal-white': '4px 4px 0px 0px #FFFFFF',
        'brutal-red': '4px 4px 0px 0px #E62429',
        'brutal-black': '4px 4px 0px 0px #101010',
        'brutal-lg': '6px 6px 0px 0px #FFD400',
        'brutal-pressed': '1px 1px 0px 0px #FFD400',
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
        'pop': 'pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
