import { useState } from 'react';
import { Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isValid, parseISO } from 'date-fns';

import { CalendarPickerSheet } from '@/components/CalendarPickerSheet';
import { RowField } from '@/components/RowField';
import { isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

interface RowDatePickerProps {
  /** `yyyy-MM-dd`. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  error?: string | null;
  minimumDate?: Date;
  maximumDate?: Date;
  showDivider?: boolean;
}

const toDate = (value: string): Date => {
  if (!value) return new Date();
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : new Date();
};

/** Row-styled date field. Opens the Expensify custom calendar (`CalendarPickerSheet`). */
export function RowDatePicker({
  value,
  onChange,
  onBlur,
  label,
  placeholder = 'Pick a date',
  error,
  minimumDate,
  maximumDate,
  showDivider,
}: RowDatePickerProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(() => toDate(value));

  return (
    <>
      <RowField
        label={label}
        error={error}
        showDivider={showDivider}
        onPress={() => {
          setPickerDate(toDate(value));
          setOpen(true);
          onBlur?.();
        }}
        icon={<Ionicons name="calendar-outline" size={17} color={color.primary} />}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: value ? color.foreground : color['muted-foreground'],
          }}
        >
          {value ? format(toDate(value), 'EEE, d MMM yyyy') : placeholder}
        </Text>
      </RowField>

      <CalendarPickerSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label ?? placeholder}
        pickerDate={pickerDate}
        onBrowse={setPickerDate}
        onDayPress={(day) => {
          onChange(day.dateString);
          setOpen(false);
        }}
        minDate={minimumDate ? isoDate(minimumDate) : undefined}
        maxDate={maximumDate ? isoDate(maximumDate) : undefined}
        markedDates={value ? { [value]: { selected: true, selectedColor: color.primary } } : {}}
      />
    </>
  );
}
