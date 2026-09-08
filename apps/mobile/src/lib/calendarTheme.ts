import type { tokens } from '@carelink/theme';

type Tokens = (typeof tokens)['light'];

/** Shared `react-native-calendars` theme, tokened + on the loaded Inter faces.
 *  Used by `CalendarPickerSheet` and the booking day-picker. */
export const calendarTheme = (color: Tokens) =>
  ({
    backgroundColor: 'transparent',
    calendarBackground: 'transparent',
    textSectionTitleColor: color['muted-foreground'],
    dayTextColor: color.foreground,
    textDisabledColor: color['muted-foreground'],
    todayTextColor: color.primary,
    selectedDayBackgroundColor: color.primary,
    selectedDayTextColor: color['primary-foreground'],
    monthTextColor: color.foreground,
    arrowColor: color['muted-foreground'],
    textDayFontFamily: 'Inter-Medium',
    textMonthFontFamily: 'Inter-Bold',
    textDayHeaderFontFamily: 'Inter-SemiBold',
    textDayFontSize: 13,
    textMonthFontSize: 15,
    textDayHeaderFontSize: 11,
  }) as const;
