import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Calendar, type DateData } from 'react-native-calendars';
import type { MarkedDates } from 'react-native-calendars/src/types';
import { format } from 'date-fns';

import { ModalCard } from '@/components/ModalCard';
import { calendarTheme } from '@/lib/calendarTheme';
import { MONTH_LABELS } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** The month being browsed (only year+month matter). Caller owns this. */
  pickerDate: Date;
  /** Year arrows / month chips — moves what's browsed, doesn't commit. */
  onBrowse: (date: Date) => void;
  onDayPress: (day: DateData) => void;
  minDate?: string;
  maxDate?: string;
  markedDates: MarkedDates;
}

/**
 * The Expensify app's custom "pick a single date" sheet: a year row + a
 * horizontal month strip to jump to a far-off month, then the day grid.
 * Ported 1:1, re-tokened onto @carelink/theme and our `ModalCard`.
 */
export function CalendarPickerSheet({
  visible,
  onClose,
  title,
  pickerDate,
  onBrowse,
  onDayPress,
  minDate,
  maxDate,
  markedDates,
}: Props) {
  const { color } = useTheme();

  const goToYear = useCallback(
    (delta: number) => onBrowse(new Date(pickerDate.getFullYear() + delta, pickerDate.getMonth(), 1)),
    [pickerDate, onBrowse],
  );
  const goToMonth = useCallback(
    (monthIndex: number) => onBrowse(new Date(pickerDate.getFullYear(), monthIndex, 1)),
    [pickerDate, onBrowse],
  );

  return (
    <ModalCard visible={visible} onClose={onClose} presentation="sheet" title={title ?? 'Pick a date'}>
      <View style={styles.yearRow}>
        <TouchableOpacity onPress={() => goToYear(-1)} style={styles.arrow}>
          <Ionicons name="chevron-back" size={20} color={color['muted-foreground']} />
        </TouchableOpacity>
        <Text style={[styles.yearText, { color: color.foreground }]}>{pickerDate.getFullYear()}</Text>
        <TouchableOpacity onPress={() => goToYear(1)} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={20} color={color['muted-foreground']} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthStrip}>
        {MONTH_LABELS.map((label, index) => {
          const selected = index === pickerDate.getMonth();
          return (
            <TouchableOpacity
              key={label}
              onPress={() => goToMonth(index)}
              style={[styles.monthChip, { backgroundColor: selected ? color.primary : color.muted }]}
            >
              <Text
                style={[
                  styles.monthChipText,
                  { color: selected ? color['primary-foreground'] : color.foreground },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Calendar
        // `current` only seeds the month on first mount — key on the browsed
        // month so jumping year/month above forces a remount.
        key={format(pickerDate, 'yyyy-MM')}
        current={format(pickerDate, 'yyyy-MM-dd')}
        minDate={minDate}
        maxDate={maxDate}
        markedDates={markedDates}
        onDayPress={onDayPress}
        firstDay={1}
        style={{ paddingHorizontal: 6 }}
        theme={calendarTheme(color)}
      />
    </ModalCard>
  );
}

const styles = StyleSheet.create({
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  arrow: { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  yearText: { fontSize: 16, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  monthStrip: { gap: 8, paddingHorizontal: 6, paddingBottom: 12 },
  monthChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChipText: { fontSize: 13, fontWeight: '600' },
});
