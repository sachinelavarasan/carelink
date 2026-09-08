import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Tone = 'info' | 'warning' | 'danger' | 'success';

/** Inline coloured callout. `info` reuses the muted surface; the rest use the
 *  matching status tokens. */
export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  const { color } = useTheme();

  const palette: Record<Tone, { bg: string; border: string; fg: string }> = {
    info: { bg: color.muted, border: color.border, fg: color.foreground },
    success: { bg: color['success-bg'], border: color['success-border'], fg: color['success-fg'] },
    warning: { bg: color['warning-bg'], border: color['warning-border'], fg: color['warning-fg'] },
    danger: { bg: color['danger-bg'], border: color['danger-border'], fg: color['danger-fg'] },
  };
  const p = palette[tone];

  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: p.bg,
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 13, color: p.fg }}>{children}</Text>
    </View>
  );
}
