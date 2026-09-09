import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

/** Initials from a full name, e.g. "Meera Nair" → "MN". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : '';
  return (first + last).toUpperCase();
}

/** Rounded-square initials chip for people (doctors, patients). Primary tint —
 *  the same identity mark used across list rows and detail headers. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'sm' }) {
  const { color } = useTheme();
  const dim = size === 'sm' ? 34 : 44;

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: size === 'sm' ? radius.sm : radius.lg - 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color['clay-soft'],
      }}
    >
      <Text
        style={{
          fontSize: size === 'sm' ? 12 : 14,
          fontWeight: '700',
          letterSpacing: 0.3,
          color: color.clay,
        }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
