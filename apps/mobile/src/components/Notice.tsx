import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Tone = 'info' | 'warning' | 'danger' | 'success';
type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Inline coloured callout. `info` reuses the muted surface (kept bordered so it
 *  reads against a card); the rest use the matching status tokens, borderless. */
export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { color } = useTheme();

  const palette: Record<Tone, { bg: string; fg: string; icon: IoniconName }> = {
    info: { bg: color.muted, fg: color.foreground, icon: 'information-circle' },
    success: { bg: color['success-bg'], fg: color['success-fg'], icon: 'checkmark-circle' },
    warning: { bg: color['warning-bg'], fg: color['warning-fg'], icon: 'warning' },
    danger: { bg: color['danger-bg'], fg: color['danger-fg'], icon: 'alert-circle' },
  };
  const p = palette[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.sm,
        borderRadius: radius.md,
        borderWidth: tone === 'info' ? 1 : 0,
        borderColor: color.border,
        backgroundColor: p.bg,
        paddingHorizontal: space.md,
        paddingVertical: 10,
      }}
    >
      <Ionicons name={p.icon} size={15} color={p.fg} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: p.fg }}>{children}</Text>
    </View>
  );
}
