import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '@/theme/ThemeProvider';

interface RowFieldProps {
  label?: string;
  error?: string | null;
  icon?: ReactNode;
  /** Defaults to a chevron when `onPress` is set. Pass `null` to suppress. */
  trailing?: ReactNode;
  showDivider?: boolean;
  onPress?: () => void;
  children: ReactNode;
}

/**
 * Shared shell for a single "row" field inside a Card — icon, label + value,
 * trailing accessory, hairline divider. `RowSelect` / `RowDatePicker` drop their
 * own content in here so a card of fields reads as one consistent style.
 * Ported from the Expensify app's RowField.
 */
export function RowField({
  label,
  error,
  icon,
  trailing,
  showDivider = true,
  onPress,
  children,
}: RowFieldProps) {
  const { color } = useTheme();
  const Container = onPress ? Pressable : View;
  const chevron =
    trailing === undefined && onPress ? (
      <Ionicons name="chevron-forward" size={18} color={color['muted-foreground']} />
    ) : (
      trailing
    );

  return (
    <View>
      <Container
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          borderBottomWidth: showDivider ? 1 : 0,
          borderBottomColor: error ? color.destructive : color.border,
        }}
      >
        {icon ? (
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.muted,
            }}
          >
            {icon}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          {label ? (
            <Text style={{ fontSize: 12, fontWeight: '500', color: color['muted-foreground'], marginBottom: 2 }}>
              {label}
            </Text>
          ) : null}
          {children}
        </View>
        {chevron}
      </Container>
      {error ? (
        <Text style={{ fontSize: 12, color: color.destructive, paddingTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}
