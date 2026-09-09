import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { space, type as t } from '@/theme/tokens';

/** Uppercase, tracked caption that opens a group of cards ("NEXT UP",
 *  "TODAY'S SCHEDULE"). Carries its own top margin for section rhythm. */
export function SectionLabel({
  children,
  first = false,
  style,
}: {
  children: string;
  /** First label on the screen — drops the top margin. */
  first?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { color } = useTheme();
  return (
    <Text
      style={[
        t.label,
        { color: color['muted-foreground'], marginTop: first ? 0 : space.sm },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
