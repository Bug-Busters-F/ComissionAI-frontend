/** @type {import('tailwindcss').Config} */

// Cada cor usa os canais RGB (--color-x-rgb, em src/assets/main.css) para que os
// modificadores de opacidade (ex.: border-danger/30, bg-brand-dark/50) gerem CSS.
// Com var(--color-x) puro o Tailwind descarta essas classes sem aviso.
const token = (name) => `rgb(var(--color-${name}-rgb) / <alpha-value>)`

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      textColor: { white: '#ffffff', 'brand-dark': token('text-primary') },
      borderColor: { white: '#ffffff' },
      ringOffsetColor: { DEFAULT: 'rgb(var(--color-surface-rgb))' },
      colors: {
        white: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          ring: token('brand-ring'),
          dark: token('brand-dark'),
          'dark-hover': token('brand-dark-hover')
        },
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
