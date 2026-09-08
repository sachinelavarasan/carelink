import type { AppointmentStatus } from '@carelink/shared';
import { type BadgeVariant, appointmentStatusMeta } from '@carelink/theme';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { color } = useTheme();
  const meta = appointmentStatusMeta[status];

  const palette: Record<BadgeVariant, { bg: string; border: string; fg: string }> = {
    success: { bg: color['success-bg'], border: color['success-border'], fg: color['success-fg'] },
    warning: { bg: color['warning-bg'], border: color['warning-border'], fg: color['warning-fg'] },
    danger: { bg: color['danger-bg'], border: color['danger-border'], fg: color['danger-fg'] },
    neutral: { bg: color.muted, border: color.border, fg: color['muted-foreground'] },
  };
  const p = palette[meta.variant];

  return (
    <View
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: p.border,
        backgroundColor: p.bg,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: p.fg }}>{meta.label}</Text>
    </View>
  );
}
