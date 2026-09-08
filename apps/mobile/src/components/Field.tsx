import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

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
  ...input
}: FieldProps) {
  const { color } = useTheme();
  const [hidden, setHidden] = useState(password);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>{label}</Text>
      ) : null}

      <View style={{ justifyContent: 'center' }}>
        <TextInput
          {...input}
          multiline={multiline}
          secureTextEntry={hidden}
          placeholderTextColor={color['muted-foreground']}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{
            borderRadius: flat ? 0 : 8,
            borderWidth: flat ? 0 : 1,
            borderColor: error ? color.destructive : color.input,
            backgroundColor: flat ? 'transparent' : color.background,
            paddingHorizontal: flat ? 0 : 12,
            paddingVertical: 11,
            paddingRight: password ? 64 : flat ? 0 : 12,
            minHeight: multiline ? 96 : undefined,
            fontSize: 16,
            color: color.foreground,
          }}
        />
        {password ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
            style={{ position: 'absolute', right: 12 }}
          >
            <Text style={{ fontSize: 13, color: color.primary }}>{hidden ? 'Show' : 'Hide'}</Text>
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
