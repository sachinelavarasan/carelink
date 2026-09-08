import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  children,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  /** Optional action(s) rendered below the text. */
  children?: ReactNode;
}) {
  const { color } = useTheme();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 8, padding: 32 }}>
      <Ionicons name={icon} size={40} color={color['muted-foreground']} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: color.foreground, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'], textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {children ? <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}
