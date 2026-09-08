import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface Option<T extends string> {
  value: T;
  label: string;
  /** Optional count pill, e.g. number of items in that scope. */
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>{label}</Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: color.border,
          backgroundColor: color.muted,
          padding: 3,
        }}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? color.primary : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? color['primary-foreground'] : color['muted-foreground'],
                }}
              >
                {opt.label}
              </Text>
              {opt.count !== undefined ? (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 5,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: active ? color['primary-foreground'] : color.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: active ? color.primary : color['muted-foreground'],
                    }}
                  >
                    {opt.count}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
