/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        paper: 'rgb(var(--color-paper) / <alpha-value>)',
        mint: 'rgb(var(--color-mint) / <alpha-value>)',
        ember: 'rgb(var(--color-ember) / <alpha-value>)',
        steel: 'rgb(var(--color-steel) / <alpha-value>)',
        bsm: {
          citron: 'rgb(var(--color-bsm-citron) / <alpha-value>)',
          matisse: 'rgb(var(--color-bsm-matisse) / <alpha-value>)',
          sanMarino: 'rgb(var(--color-bsm-sanMarino) / <alpha-value>)',
          catskillWhite: 'rgb(var(--color-bsm-catskillWhite) / <alpha-value>)',
          rockBlue: 'rgb(var(--color-bsm-rockBlue) / <alpha-value>)',
          ming: 'rgb(var(--color-bsm-ming) / <alpha-value>)',
          hippieGreen: 'rgb(var(--color-bsm-hippieGreen) / <alpha-value>)',
          stTropaz: 'rgb(var(--color-bsm-stTropaz) / <alpha-value>)',
        },
        brand: {
          primary: 'rgb(var(--color-brand-primary) / <alpha-value>)',
          primary2: 'rgb(var(--color-brand-primary2) / <alpha-value>)',
          accent: 'rgb(var(--color-brand-accent) / <alpha-value>)',
          bg: 'rgb(var(--color-brand-bg) / <alpha-value>)',
          surface: 'rgb(var(--color-brand-surface) / <alpha-value>)',
          muted: 'rgb(var(--color-brand-muted) / <alpha-value>)',
          text: 'rgb(var(--color-brand-text) / <alpha-value>)',
          textMuted: 'rgb(var(--color-brand-text-muted) / <alpha-value>)',
          border: 'rgb(var(--color-brand-border) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 18px 45px rgba(9, 14, 20, 0.08)',
      },
      borderRadius: {
        xl: '18px',
      },
    },
  },
  plugins: [],
};
