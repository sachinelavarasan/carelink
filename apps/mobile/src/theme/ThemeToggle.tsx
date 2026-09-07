import { Pressable, Text } from 'react-native';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel="Toggle dark mode"
      className="rounded-md border border-border px-2 py-1"
    >
      <Text className="text-sm text-foreground">{theme === 'dark' ? '☀︎' : '☾'}</Text>
    </Pressable>
  );
}
