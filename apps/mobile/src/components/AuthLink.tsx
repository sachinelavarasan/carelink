import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** "Don't have an account? Sign up" style row. */
export function AuthLink({
  description,
  linkText,
  onPress,
  disabled = false,
}: {
  description?: string;
  linkText: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
      {description ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{description}</Text>
      ) : null}
      <Pressable onPress={onPress} disabled={disabled} hitSlop={6}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: color.primary, opacity: disabled ? 0.5 : 1 }}>
          {linkText}
        </Text>
      </Pressable>
    </View>
  );
}
