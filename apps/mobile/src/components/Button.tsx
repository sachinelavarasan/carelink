import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  busy = false,
  disabled = false,
  style,
}: ButtonProps) {
  const { color } = useTheme();
  const isDisabled = disabled || busy;

  const bg: Record<Variant, string> = {
    primary: color.primary,
    secondary: color.muted,
    destructive: 'transparent',
    outline: 'transparent',
    ghost: 'transparent',
  };
  const fg: Record<Variant, string> = {
    primary: color['primary-foreground'],
    secondary: color.foreground,
    destructive: color.destructive,
    outline: color.foreground,
    ghost: color.primary,
  };
  const borderColor: Partial<Record<Variant, string>> = {
    secondary: color.border,
    outline: color.border,
    destructive: color.destructive,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: space.sm,
          borderRadius: radius.md,
          paddingVertical: size === 'sm' ? space.sm : 13,
          paddingHorizontal: size === 'sm' ? space.md : space.lg,
          backgroundColor: bg[variant],
          borderWidth: borderColor[variant] ? 1 : 0,
          borderColor: borderColor[variant],
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy && <ActivityIndicator color={fg[variant]} size="small" />}
      <Text
        style={{
          color: fg[variant],
          fontWeight: '600',
          fontSize: size === 'sm' ? 13 : 15,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
