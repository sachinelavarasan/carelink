import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, space, type as t } from '@/theme/tokens';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  password?: boolean;
  /** Drop the box — for use inside an already-bordered card. */
  flat?: boolean;
}

/** Labelled text input with an error line and an optional reveal toggle.
 *  `value` / `onChangeText` map straight onto a react-hook-form Controller.
 *  Pass `multiline` for a textarea. */
export function Field({
  label,
  error,
  hint,
  password = false,
  flat = false,
  multiline = false,
  onFocus,
  onBlur,
  ...input
}: FieldProps) {
  const { color } = useTheme();
  const [hidden, setHidden] = useState(password);
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? color.destructive
    : focused
      ? color.ring
      : color.input;

  return (
    <View style={{ gap: space.xs + 2 }}>
      {label ? (
        <Text style={[t.label, { color: color['muted-foreground'] }]}>{label}</Text>
      ) : null}

      <View style={{ justifyContent: 'center' }}>
        <TextInput
          {...input}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={color['muted-foreground']}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            borderRadius: flat ? 0 : radius.sm,
            borderWidth: flat ? 0 : 1,
            borderColor,
            backgroundColor: flat ? 'transparent' : color.background,
            paddingHorizontal: flat ? 0 : space.md,
            paddingVertical: 11,
            paddingRight: password ? 64 : flat ? 0 : space.md,
            minHeight: multiline ? 96 : undefined,
            fontSize: 16,
            color: color.foreground,
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={{ position: 'absolute', right: space.md }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: color.primary }}>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ fontSize: 12, color: color.destructive }}>{error}</Text>
      ) : hint ? (
        <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>{hint}</Text>
      ) : null}
    </View>
  );
}
