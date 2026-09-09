import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, space } from '@/theme/tokens';

export function Card({
  children,
  style,
  elevated = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Lift the card off the page — for the one thing on a screen that leads. */
  elevated?: boolean;
}) {
  const { color } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: color.border,
          backgroundColor: color.card,
          padding: space.lg,
          gap: space.xs + 2,
        },
        elevated && elevation.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}
