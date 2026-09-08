import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, isValid, parse } from 'date-fns';
import { PaperProvider } from 'react-native-paper';
import { TimePickerModal, en, registerTranslation } from 'react-native-paper-dates';

import { RowField } from '@/components/RowField';
import { getPaperTheme } from '@/lib/paperTheme';
import { useTheme } from '@/theme/ThemeProvider';

// paper-dates throws without a registered translation.
registerTranslation('en', en);

interface RowTimePickerProps {
  /** `HH:mm`. */
  value: string;
  onChange: (time: string) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  error?: string | null;
  showDivider?: boolean;
}

const toTime = (value: string): Date => {
  const parsed = parse(value || '00:00', 'HH:mm', new Date());
  return isValid(parsed) ? parsed : new Date();
};

/**
 * Row-styled time picker — the Expensify app's `RowTimePicker`, backed by
 * `react-native-paper-dates`' `TimePickerModal` themed via `getPaperTheme`.
 */
export function RowTimePicker({
  value,
  onChange,
  onBlur,
  label,
  placeholder = 'Select time',
  error,
  showDivider,
}: RowTimePickerProps) {
  const { color, theme } = useTheme();
  const paperTheme = useMemo(() => getPaperTheme(color, theme === 'dark'), [color, theme]);
  const [open, setOpen] = useState(false);

  const current = toTime(value);

  return (
    <>
      <RowField
        label={label}
        error={error}
        showDivider={showDivider}
        onPress={() => {
          setOpen(true);
          onBlur?.();
        }}
        icon={<Ionicons name="time-outline" size={17} color={color.primary} />}
      >
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: value ? color.foreground : color['muted-foreground'],
          }}
        >
          {value ? format(current, 'h:mm a') : placeholder}
        </Text>
      </RowField>

      <PaperProvider theme={paperTheme}>
        <TimePickerModal
          visible={open}
          onDismiss={() => setOpen(false)}
          onConfirm={({ hours, minutes }) => {
            setOpen(false);
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            onChange(format(d, 'HH:mm'));
          }}
          hours={current.getHours()}
          minutes={current.getMinutes()}
          defaultInputType="picker"
          use24HourClock
        />
      </PaperProvider>
    </>
  );
}
