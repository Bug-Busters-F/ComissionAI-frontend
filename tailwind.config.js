/** @type {import('tailwindcss').Config} */

// Os tokens ficam em src/assets/main.css como canais RGB ("159 232 112").
// Assim o Tailwind consegue aplicar modificadores de opacidade (ex.: bg-danger/30)
// e o tema escuro só precisa redefinir as variáveis.
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`

export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          ring: token('brand-ring'),
          dark: token('brand-dark'),
          'dark-hover': token('brand-dark-hover')
        },
        // Superfícies e papéis semânticos usados pelo tema claro/escuro
        surface: token('surface'),
        'on-brand': token('on-brand'),
        inverse: {
          DEFAULT: token('inverse'),
          hover: token('inverse-hover'),
          border: token('inverse-border'),
          muted: token('inverse-muted')
        },
        'on-inverse': token('on-inverse'),
        'on-status': token('on-status'),
        overlay: token('overlay'),
        sage: {
          DEFAULT: token('sage'),
          light: token('sage-light'),
          pill: token('sage-pill'),
          muted: token('sage-muted'),
          subtle: token('sage-subtle'),
          surface: token('sage-surface'),
          border: token('sage-border'),
          'border-light': token('sage-border-light'),
          'border-dark': token('sage-border-dark')
        },
        success: {
          DEFAULT: token('success'),
          bg: token('success-bg'),
          surface: token('success-surface'),
          dark: token('success-dark'),
          text: token('success-text')
        },
        warning: {
          DEFAULT: token('warning'),
          bg: token('warning-bg'),
          light: token('warning-light'),
          border: token('warning-border'),
          dark: token('warning-dark'),
          text: token('warning-text')
        },
        danger: {
          DEFAULT: token('danger'),
          bg: token('danger-bg'),
          light: token('danger-light'),
          dark: token('danger-dark')
        }
      }
    },
  },
  plugins: [],
}
