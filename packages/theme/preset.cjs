/**
 * Shared Tailwind **v3** preset — consumed by apps/mobile (NativeWind v4, which
 * requires Tailwind 3.4). apps/web is on Tailwind v4 + shadcn and maps the same
 * CSS variables via an `@theme inline` block in its own CSS instead of this file.
 *
 * Colours resolve to the custom properties in ./theme.css, so `bg-card` /
 * `text-foreground` re-resolve automatically when `.dark` is active.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: { DEFAULT: 'var(--card)', foreground: 'var(--card-foreground)' },
        popover: { DEFAULT: 'var(--popover)', foreground: 'var(--popover-foreground)' },
        primary: { DEFAULT: 'var(--primary)', foreground: 'var(--primary-foreground)' },
        secondary: { DEFAULT: 'var(--secondary)', foreground: 'var(--secondary-foreground)' },
        muted: { DEFAULT: 'var(--muted)', foreground: 'var(--muted-foreground)' },
        accent: { DEFAULT: 'var(--accent)', foreground: 'var(--accent-foreground)' },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        'success-bg': 'var(--success-bg)',
        'success-fg': 'var(--success-fg)',
        'success-border': 'var(--success-border)',
        'warning-bg': 'var(--warning-bg)',
        'warning-fg': 'var(--warning-fg)',
        'warning-border': 'var(--warning-border)',
        'danger-bg': 'var(--danger-bg)',
        'danger-fg': 'var(--danger-fg)',
        'danger-border': 'var(--danger-border)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
};
