import { Pressable, Text } from 'react-native';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle, color } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel="Toggle dark mode"
      style={{
        borderRadius: 6,
        borderWidth: 1,
        borderColor: color.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text style={{ fontSize: 14, color: color.foreground }}>
        {theme === 'dark' ? '☀︎' : '☾'}
      </Text>
    </Pressable>
  );
}
