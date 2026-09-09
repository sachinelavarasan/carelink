import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { type as t } from '@/theme/tokens';

/** The page heading every screen opens with — one place for the display style. */
export function ScreenTitle({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const { color } = useTheme();
  return <Text style={[t.title, { color: color.foreground }, style]}>{children}</Text>;
}
