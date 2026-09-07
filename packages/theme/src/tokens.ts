export type ThemeName = 'light' | 'dark';

/**
 * Curated subset of the CSS variables in theme.css — the ones needed where a
 * Tailwind class / CSS variable can't reach: React Native colour props
 * (`placeholderTextColor`, `ActivityIndicator` / icon `color`) and the web
 * `<meta name="theme-color">`. Names follow shadcn/ui vocabulary.
 */
export type TokenName =
  | 'background'
  | 'foreground'
  | 'card'
  | 'card-foreground'
  | 'primary'
  | 'primary-foreground'
  | 'secondary'
  | 'muted'
  | 'muted-foreground'
  | 'destructive'
  | 'border'
  | 'input'
  | 'ring'
  | 'success-bg'
  | 'success-fg'
  | 'success-border'
  | 'warning-bg'
  | 'warning-fg'
  | 'warning-border'
  | 'danger-bg'
  | 'danger-fg'
  | 'danger-border';

/**
 * Persisted-theme storage key — `localStorage` on web, `AsyncStorage` on mobile.
 * The web no-flash script in apps/web/index.html hardcodes this string; the copy
 * is asserted equal in tokens.spec.ts.
 */
export const THEME_STORAGE_KEY = 'carelink.theme';

export const tokens: Record<ThemeName, Record<TokenName, string>> = {
  light: {
    'background': '#fafafa',
    'foreground': '#18181b',
    'card': '#ffffff',
    'card-foreground': '#18181b',
    'primary': '#0f766e',
    'primary-foreground': '#ffffff',
    'secondary': '#f4f4f5',
    'muted': '#f4f4f5',
    'muted-foreground': '#52525b',
    'destructive': '#b91c1c',
    'border': '#e4e4e7',
    'input': '#e4e4e7',
    'ring': '#0f766e',
    'success-bg': '#f0fdf4',
    'success-fg': '#15803d',
    'success-border': '#bbf7d0',
    'warning-bg': '#fffbeb',
    'warning-fg': '#b45309',
    'warning-border': '#fde68a',
    'danger-bg': '#fef2f2',
    'danger-fg': '#b91c1c',
    'danger-border': '#fecaca',
  },
  dark: {
    'background': '#0b0b0d',
    'foreground': '#f4f4f5',
    'card': '#17171a',
    'card-foreground': '#f4f4f5',
    'primary': '#2dd4bf',
    'primary-foreground': '#04211f',
    'secondary': '#27272a',
    'muted': '#27272a',
    'muted-foreground': '#a1a1aa',
    'destructive': '#f87171',
    'border': '#3f3f46',
    'input': '#3f3f46',
    'ring': '#5eead4',
    'success-bg': '#0f2a1a',
    'success-fg': '#4ade80',
    'success-border': '#166534',
    'warning-bg': '#2a1e0a',
    'warning-fg': '#fbbf24',
    'warning-border': '#92400e',
    'danger-bg': '#2a1215',
    'danger-fg': '#f87171',
    'danger-border': '#991b1b',
  },
};

export const TOKEN_NAMES = Object.keys(tokens.light) as TokenName[];
