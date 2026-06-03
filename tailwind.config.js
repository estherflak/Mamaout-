/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dusty: {
          rose: '#d4a5a5',
          roseDark: '#c08080',
          roseLight: '#eedede',
          rosePale: '#f9efef',
        },
        sage: {
          50: '#f4f7f4',
          100: '#e2ece2',
          200: '#c5d9c5',
          300: '#a4c0a4',
          400: '#7da37d',
          500: '#5a8a5a',
        },
        cream: {
          50: '#fdfaf6',
          100: '#faf3e8',
          200: '#f4e6d0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
}
