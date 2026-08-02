/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand v1 (marketing/brand.md + src/styles/tokens.css) — canonical.
        // The legacy dusty/sage/cream theme below migrates toward these;
        // use only brand tokens in new UI.
        lilac: { DEFAULT: '#A78BFA', pale: '#F3EEFF' },
        plum: { DEFAULT: '#4C2A85', soft: '#7A6C99' },
        butter: { DEFAULT: '#FFD97A' },
        canvas: '#FAF6EF',   // default background — never pure white
        card: '#FFFDF9',     // card surfaces
        warmline: '#EEE5D8', // hairline borders
        blush: '#D98B8B',    // functional error — never alarm red
        // Legacy theme (pre-brand) — being phased out:
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
        // Legacy default — migrates to Nunito Sans / Assistant (brand.md)
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Brand: headlines (Fraunces; Noto Serif Hebrew via :lang(he) tokens)
        serif: ['Fraunces', 'Noto Serif Hebrew', 'Georgia', 'serif'],
        // Brand: body/UI (Nunito Sans; Assistant covers Hebrew)
        'brand-sans': ['Nunito Sans', 'Assistant', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Plum-tinted elevation (brand.md: never gray shadows)
        soft: '0 1px 3px rgba(76, 42, 133, .08)',
        raised: '0 4px 12px rgba(76, 42, 133, .10)',
        float: '0 8px 24px rgba(76, 42, 133, .14)',
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
