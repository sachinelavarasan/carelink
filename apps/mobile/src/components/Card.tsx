import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { color } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: 12,
          borderWidth: 1,
          borderColor: color.border,
          backgroundColor: color.card,
          padding: 16,
          gap: 6,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
