import { useState } from 'react';
import { Platform, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Dropdown } from 'react-native-element-dropdown';

import { useTheme } from '@/theme/ThemeProvider';

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

interface SelectProps<T extends string> {
  options: readonly SelectOption<T>[];
  value: T | '';
  onChange: (value: T | '') => void;
  label?: string;
  placeholder?: string;
  error?: string;
  search?: boolean;
  clearable?: boolean;
  /** Drop the bordered box — for use inside an already-bordered card. */
  flat?: boolean;
  disabled?: boolean;
}

/**
 * Searchable dropdown. Ported from the Expensify app's CustomSelectInput —
 * kept the popup-position handling (incl. the Android edge-to-edge StatusBar
 * offset) and re-tokened onto @carelink/theme.
 */
export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = 'Select…',
  error,
  search = false,
  clearable = false,
  flat = false,
  disabled = false,
}: SelectProps<T>) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || options.length === 0;

  const borderColor = error
    ? color.destructive
    : focused
      ? color.primary
      : color.input;

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>{label}</Text>
          {clearable && value ? (
            <TouchableOpacity onPress={() => onChange('')} hitSlop={8}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: color.primary }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Dropdown
        mode="auto"
        data={options as SelectOption<T>[]}
        labelField="label"
        valueField="value"
        value={value}
        onChange={(item) => onChange(item.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disable={isDisabled}
        search={search}
        searchField="label"
        searchPlaceholder="Search…"
        searchPlaceholderTextColor={color['muted-foreground']}
        activeColor={`${color.primary}26`}
        placeholder={options.length === 0 ? 'No options' : placeholder}
        placeholderStyle={{ color: color['muted-foreground'], fontSize: 16 }}
        selectedTextStyle={{ color: color.foreground, fontSize: 16 }}
        itemTextStyle={{ color: color.foreground, fontSize: 16 }}
        itemContainerStyle={{ backgroundColor: color.card }}
        inputSearchStyle={{
          borderRadius: 8,
          borderColor: color.input,
          color: color.foreground,
          fontSize: 16,
        }}
        renderRightIcon={() => (
          <Ionicons name="chevron-down" size={14} color={color['muted-foreground']} />
        )}
        style={{
          borderRadius: flat ? 0 : 8,
          borderWidth: flat ? 0 : 1,
          borderColor,
          paddingHorizontal: flat ? 0 : 12,
          paddingVertical: flat ? 6 : 11,
          backgroundColor: flat ? 'transparent' : color.background,
        }}
        containerStyle={{
          backgroundColor: color.card,
          borderColor: color.border,
          borderRadius: 8,
          borderWidth: 1,
          overflow: 'hidden',
          // element-dropdown adds StatusBar.currentHeight to the popup top on
          // Android, which double-counts under edge-to-edge — cancel it out.
          marginTop: Platform.OS === 'android' ? -(StatusBar.currentHeight ?? 0) : 0,
        }}
        maxHeight={220}
      />

      {error ? <Text style={{ fontSize: 12, color: color.destructive }}>{error}</Text> : null}
    </View>
  );
}
