import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { format, isValid, parse, parseISO } from 'date-fns';

import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';

type Mode = 'date' | 'time';

interface DatePickerFieldProps {
  /** `yyyy-MM-dd` for mode="date", `HH:mm` for mode="time". */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  mode?: Mode;
  label?: string;
  placeholder?: string;
  error?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const STORE = { date: 'yyyy-MM-dd', time: 'HH:mm' } as const;
const DISPLAY = { date: 'EEE, d MMM yyyy', time: 'h:mm a' } as const;

function toDate(value: string, mode: Mode): Date {
  if (!value) return new Date();
  const parsed = mode === 'date' ? parseISO(value) : parse(value, 'HH:mm', new Date());
  return isValid(parsed) ? parsed : new Date();
}

/**
 * Pressable trigger + native picker. Pattern from the Expensify app's
 * CustomDatePicker, backed by @react-native-community/datetimepicker so it needs
 * no extra config beyond the plugin.
 */
export function DatePickerField({
  value,
  onChange,
  onBlur,
  mode = 'date',
  label,
  placeholder = 'Pick a date',
  error,
  minimumDate,
  maximumDate,
}: DatePickerFieldProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => toDate(value, mode));

  const commit = (d: Date) => onChange(format(d, STORE[mode]));

  const openPicker = () => {
    setDraft(toDate(value, mode));
    setOpen(true);
    onBlur?.();
  };

  const onAndroidChange = (e: DateTimePickerEvent, d?: Date) => {
    setOpen(false);
    if (e.type === 'set' && d) commit(d);
  };

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>{label}</Text>
      ) : null}

      <Pressable
        onPress={openPicker}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: error ? color.destructive : color.input,
          backgroundColor: color.background,
          paddingHorizontal: 12,
          paddingVertical: 11,
        }}
      >
        <Ionicons
          name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
          size={16}
          color={color['muted-foreground']}
        />
        <Text style={{ fontSize: 16, color: value ? color.foreground : color['muted-foreground'] }}>
          {value ? format(toDate(value, mode), DISPLAY[mode]) : placeholder}
        </Text>
      </Pressable>

      {error ? <Text style={{ fontSize: 12, color: color.destructive }}>{error}</Text> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draft}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <View style={{ backgroundColor: color.card, paddingBottom: 24 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  padding: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: color.border,
                }}
              >
                <Button label="Cancel" variant="ghost" size="sm" onPress={() => setOpen(false)} />
                <Button
                  label="Done"
                  size="sm"
                  onPress={() => {
                    commit(draft);
                    setOpen(false);
                  }}
                />
              </View>
              <DateTimePicker
                value={draft}
                mode={mode}
                display="spinner"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                onChange={(_, d) => d && setDraft(d)}
                textColor={color.foreground}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
