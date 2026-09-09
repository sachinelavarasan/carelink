import type { ThemeName, TokenName } from '@carelink/theme';

/**
 * Mobile-only colour palette. The app used to read `@carelink/theme`'s `tokens`
 * directly; this file overrides those values with the "Cyan · Slate" identity —
 * a Tailwind cyan primary on slate neutrals, with a white screen background and
 * a faintly tinted `card` surface for containers (the shared package and the web
 * app are untouched). Keys are the same `TokenName` set plus three additions:
 *   - `primary-soft`  tinted fill for the active tab pill / soft chips
 *   - `clay` / `clay-soft`  the one warm accent, used only on person avatars
 */
export type MobileTokenName = TokenName | 'primary-soft' | 'clay' | 'clay-soft';

export const palette: Record<ThemeName, Record<MobileTokenName, string>> = {
  light: {
    'background': '#ffffff',
    'foreground': '#172033',
    'card': '#f8fafc',
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
    'primary-soft': '#cff2f8',
    'clay': '#bd6a50',
    'clay-soft': '#f1ddd4',
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
    'ring': '#22d3ee',
    'success-bg': '#052e16',
    'success-fg': '#4ade80',
    'success-border': '#166534',
    'warning-bg': '#422006',
    'warning-fg': '#fbbf24',
    'warning-border': '#78350f',
    'danger-bg': '#450a0a',
    'danger-fg': '#f87171',
    'danger-border': '#7f1d1d',
    'primary-soft': '#0e3a44',
    'clay': '#d98d72',
    'clay-soft': '#382720',
  },
};
