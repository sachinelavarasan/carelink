import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { mono } from '@/lib/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as t } from '@/theme/tokens';

export function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number | string;
  hint?: string;
}) {
  const { color } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '47%',
        borderRadius: radius.md + 2,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: color.card,
        padding: space.md,
        gap: 3,
      }}
    >
      <Ionicons name={icon} size={16} color={color.primary} />
      <Text style={[mono('600'), { fontSize: 20, color: color.foreground }]}>{value}</Text>
      <Text style={[t.label, { color: color['muted-foreground'] }]}>{label}</Text>
      {hint ? (
        <Text style={{ fontSize: 11, color: color['muted-foreground'] }}>{hint}</Text>
      ) : null}
    </View>
  );
}
