import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'primary' | 'outline' | 'ghost' | 'destructive';
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
    destructive: color.destructive,
    outline: 'transparent',
    ghost: 'transparent',
  };
  const fg: Record<Variant, string> = {
    primary: color['primary-foreground'],
    destructive: '#ffffff',
    outline: color.foreground,
    ghost: color.primary,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          borderRadius: 8,
          paddingVertical: size === 'sm' ? 8 : 13,
          paddingHorizontal: size === 'sm' ? 12 : 16,
          backgroundColor: bg[variant],
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: color.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {busy && <ActivityIndicator color={fg[variant]} size="small" />}
      <Text style={{ color: fg[variant], fontWeight: '600', fontSize: size === 'sm' ? 13 : 15 }}>
        {label}
      </Text>
    </Pressable>
  );
}
