import { DrugCategoryFlag } from '@carelink/shared';
import { drugCategoryFlagMeta } from '@carelink/theme';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

const FLAGS = Object.values(DrugCategoryFlag);

/** Toggleable drug-category chips. `value` / `onChange` work on a Set of flags. */
export function FlagChips({
  value,
  onChange,
}: {
  value: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {FLAGS.map((f) => {
        const on = value.has(f);
        return (
          <Pressable
            key={f}
            onPress={() => {
              const next = new Set(value);
              if (next.has(f)) next.delete(f);
              else next.add(f);
              onChange(next);
            }}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderColor: on ? color.primary : color.border,
              backgroundColor: on ? color.primary : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: on ? color['primary-foreground'] : color['muted-foreground'],
              }}
            >
              {drugCategoryFlagMeta[f].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
