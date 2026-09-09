import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

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
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: space.sm, padding: space.xxl + 8 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color.muted,
          marginBottom: space.xs,
        }}
      >
        <Ionicons name={icon} size={28} color={color['muted-foreground']} />
      </View>
      <Text style={{ fontSize: 15, fontWeight: '600', color: color.foreground, textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: 13, lineHeight: 18, color: color['muted-foreground'], textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {children ? <View style={{ marginTop: space.sm, alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}
