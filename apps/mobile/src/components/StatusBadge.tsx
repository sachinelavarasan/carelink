import type { AppointmentStatus } from '@carelink/shared';
import { type BadgeVariant, appointmentStatusMeta } from '@carelink/theme';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/tokens';

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { color } = useTheme();
  const meta = appointmentStatusMeta[status];

  // Colour is never the only signal — the label text ("Cancelled" vs "No-show")
  // carries the distinction on its own.
  const palette: Record<BadgeVariant, { bg: string; fg: string }> = {
    success: { bg: color['success-bg'], fg: color['success-fg'] },
    warning: { bg: color['warning-bg'], fg: color['warning-fg'] },
    danger: { bg: color['danger-bg'], fg: color['danger-fg'] },
    neutral: { bg: color.muted, fg: color['muted-foreground'] },
  };
  const p = palette[meta.variant];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radius.pill,
        backgroundColor: p.bg,
        paddingHorizontal: 9,
        paddingVertical: 3,
      }}
    >
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: '700',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          color: p.fg,
        }}
      >
        {meta.label}
      </Text>
    </View>
  );
}
