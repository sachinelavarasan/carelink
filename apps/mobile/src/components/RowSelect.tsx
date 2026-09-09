import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ModalCard } from '@/components/ModalCard';
import { RowField } from '@/components/RowField';
import type { SelectOption } from '@/components/Select';
import { useTheme } from '@/theme/ThemeProvider';

interface RowSelectProps<T extends string> {
  options: readonly SelectOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  label?: string;
  sheetTitle?: string;
  placeholder?: string;
  error?: string | null;
  icon?: React.ReactNode;
  showDivider?: boolean;
}

/**
 * Row-styled select that opens a bottom-sheet list of options — the in-card
 * equivalent of `Select`. Backed by `ModalCard` (RN `Modal`); `@gorhom/bottom-sheet`
 * does not present on this RN version (see `BottomSheet.tsx`).
 */
export function RowSelect<T extends string>({
  options,
  value,
  onChange,
  label,
  sheetTitle,
  placeholder = 'Select…',
  error,
  icon,
  showDivider,
}: RowSelectProps<T>) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <>
      <RowField
        label={label}
        error={error}
        icon={icon}
        showDivider={showDivider}
        onPress={() => options.length > 0 && setOpen(true)}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: selected ? color.foreground : color['muted-foreground'],
          }}
        >
          {selected ? selected.label : options.length === 0 ? 'No options' : placeholder}
        </Text>
      </RowField>

      <ModalCard
        visible={open}
        onClose={() => setOpen(false)}
        presentation="sheet"
        title={sheetTitle ?? label}
      >
        <View>
          {options.map((opt, idx) => {
            const active = opt.value === value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 14,
                  borderBottomWidth: idx < options.length - 1 ? 1 : 0,
                  borderBottomColor: color.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: active ? '700' : '500',
                    color: active ? color.primary : color.foreground,
                  }}
                >
                  {opt.label}
                </Text>
                {active ? <Ionicons name="checkmark" size={18} color={color.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ModalCard>
    </>
  );
}
