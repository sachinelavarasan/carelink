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
    'background': '#f8fafc',
    'foreground': '#172033',
    'card': '#ffffff',
    'card-foreground': '#172033',
    'primary': '#0891b2',
    'primary-foreground': '#ffffff',
    'secondary': '#f1f5f9',
    'muted': '#f1f5f9',
    'muted-foreground': '#64748b',
    'destructive': '#dc2626',
    'border': '#e2e8f0',
    'input': '#e2e8f0',
    'ring': '#0891b2',
    'success-bg': '#f0fdf4',
    'success-fg': '#15803d',
    'success-border': '#bbf7d0',
    'warning-bg': '#fffbeb',
    'warning-fg': '#b45309',
    'warning-border': '#fde68a',
    'danger-bg': '#fef2f2',
    'danger-fg': '#dc2626',
    'danger-border': '#fecaca',
  },
  dark: {
    'background': '#0b171b',
    'foreground': '#ecfeff',
    'card': '#102126',
    'card-foreground': '#ecfeff',
    'primary': '#22d3ee',
    'primary-foreground': '#083344',
    'secondary': '#1b2a30',
    'muted': '#1b2a30',
    'muted-foreground': '#94a3b8',
    'destructive': '#f87171',
    'border': '#334155',
    'input': '#334155',
    'ring': '#67e8f9',
    'success-bg': '#052e16',
    'success-fg': '#4ade80',
    'success-border': '#166534',
    'warning-bg': '#422006',
    'warning-fg': '#fbbf24',
    'warning-border': '#92400e',
    'danger-bg': '#450a0a',
    'danger-fg': '#f87171',
    'danger-border': '#991b1b',
  },
};

export const TOKEN_NAMES = Object.keys(tokens.light) as TokenName[];
