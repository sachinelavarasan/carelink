import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import type { tokens } from '@carelink/theme';

type Tokens = (typeof tokens)['light'];

/**
 * Maps our `@carelink/theme` tokens onto react-native-paper's MD3 theme, so
 * paper-dates' `TimePickerModal` (which reads colours from `PaperProvider`, not
 * our `useTheme`) renders in the app palette instead of Paper's default purple.
 * Ported from the Expensify app's `getPaperTheme`.
 */
export function getPaperTheme(color: Tokens, dark: boolean): MD3Theme {
  const base = dark ? MD3DarkTheme : MD3LightTheme;
  const scrim = 'rgba(0,0,0,0.5)';
  return {
    ...base,
    dark,
    colors: {
      ...base.colors,
      primary: color.primary,
      onPrimary: color['primary-foreground'],
      primaryContainer: color.primary,
      onPrimaryContainer: color['primary-foreground'],
      secondary: color.secondary,
      onSecondary: color.foreground,
      background: color.card,
      onBackground: color.foreground,
      surface: color.card,
      onSurface: color.foreground,
      surfaceVariant: color.muted,
      onSurfaceVariant: color['muted-foreground'],
      outline: color.input,
      outlineVariant: color.border,
      error: color.destructive,
      onError: '#ffffff',
      scrim,
      backdrop: scrim,
      // TimePickerModal's dialog card reads elevation.level3 for its background.
      elevation: {
        level0: 'transparent',
        level1: color.card,
        level2: color.card,
        level3: color.card,
        level4: color.card,
        level5: color.card,
      },
    },
  };
}
