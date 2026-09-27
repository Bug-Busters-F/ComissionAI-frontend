/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          ring: 'var(--color-brand-ring)',
          dark: 'var(--color-brand-dark)',
          'dark-hover': 'var(--color-brand-dark-hover)'
        },
        sage: {
          DEFAULT: 'var(--color-sage)',
          light: 'var(--color-sage-light)',
          pill: 'var(--color-sage-pill)',
          muted: 'var(--color-sage-muted)',
          subtle: 'var(--color-sage-subtle)',
          border: 'var(--color-sage-border)',
          'border-light': 'var(--color-sage-border-light)',
          'border-dark': 'var(--color-sage-border-dark)'
        },
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-success-bg)',
          surface: 'var(--color-success-surface)',
          dark: 'var(--color-success-dark)',
          text: 'var(--color-success-text)'
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-warning-bg)',
          light: 'var(--color-warning-light)',
          border: 'var(--color-warning-border)',
          dark: 'var(--color-warning-dark)',
          text: 'var(--color-warning-text)'
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg: 'var(--color-danger-bg)',
          light: 'var(--color-danger-light)',
          dark: 'var(--color-danger-dark)'
        }
      }
    },
  },
  plugins: [],
}
