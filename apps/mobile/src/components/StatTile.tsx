import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';

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
        borderRadius: 12,
        borderWidth: 1,
        borderColor: color.border,
        backgroundColor: color.card,
        padding: 14,
        gap: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={icon} size={15} color={color['muted-foreground']} />
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '700', color: color.foreground }}>{value}</Text>
      {hint ? <Text style={{ fontSize: 11, color: color['muted-foreground'] }}>{hint}</Text> : null}
    </View>
  );
}
