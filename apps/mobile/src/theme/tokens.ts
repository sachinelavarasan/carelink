import type { TextStyle, ViewStyle } from 'react-native';

/**
 * Non-colour design primitives — the spacing / radius / type / elevation values
 * the components used to hard-code. Colour still comes from `useTheme().color`
 * (the `@carelink/theme` token map); this file only covers what's theme-neutral.
 */

/** 4-pt spacing scale. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

/** Corner radii, spent by role rather than one value everywhere. */
export const radius = {
  sm: 10, // inputs, chips
  md: 12, // buttons
  lg: 16, // cards, sheets
  pill: 999,
} as const;

/**
 * Type ramp. Inter carries the UI (the weight-patch in `lib/fonts` maps
 * `fontWeight` → the matching `Inter-*` face); these presets just fix the
 * size / weight / tracking pairings so headings and labels stay consistent.
 */
export const type = {
  /** Screen titles ("Find a doctor"). */
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.4 } satisfies TextStyle,
  /** Card / section headings. */
  heading: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 } satisfies TextStyle,
  /** Default body copy. */
  body: { fontSize: 14, fontWeight: '400' } satisfies TextStyle,
  /** Secondary / meta lines. */
  meta: { fontSize: 13, fontWeight: '400' } satisfies TextStyle,
  /** Uppercase field / stat labels. */
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  /** Fine print, hints, errors. */
  caption: { fontSize: 12, fontWeight: '400' } satisfies TextStyle,
} as const;

/**
 * Shadow presets. RN needs the iOS `shadow*` group and Android `elevation`
 * together; `card` is the resting lift, `raised` is for the one element that
 * needs to pop (active segment, sheet).
 */
export const elevation = {
  card: {
    shadowColor: '#1c2b26',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  } satisfies ViewStyle,
  raised: {
    shadowColor: '#1c2b26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  } satisfies ViewStyle,
} as const;
