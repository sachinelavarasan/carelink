import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface ScreenProps {
  children: ReactNode;
  /** Wrap content in a ScrollView (default true). Set false for full-bleed lists. */
  scroll?: boolean;
  /** Horizontal + vertical inset (default 16). */
  padded?: boolean;
  center?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Themed page container. The root layout owns the SafeArea; this just paints the
 *  background and gives every screen the same gutter. */
export function Screen({
  children,
  scroll = true,
  padded = true,
  center = false,
  onRefresh,
  refreshing = false,
  contentStyle,
}: ScreenProps) {
  const { color } = useTheme();
  const pad = padded ? 16 : 0;

  const inner: StyleProp<ViewStyle> = [
    { padding: pad, flexGrow: 1 },
    center && { justifyContent: 'center' },
    contentStyle,
  ];

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: color.background }, inner]}>{children}</View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: color.background }}
      contentContainerStyle={inner}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={color['muted-foreground']}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}
