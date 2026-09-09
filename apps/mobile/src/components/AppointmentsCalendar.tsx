import type { AppointmentListItem } from '@carelink/shared';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import type { MarkedDates } from 'react-native-calendars/src/types';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppointmentItems } from '@/hooks/useAppointments';
import { calendarTheme } from '@/lib/calendarTheme';
import { mono } from '@/lib/fonts';
import { fmtDayHeading, fmtTime, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { space, type as t } from '@/theme/tokens';

/** Calendar view for the Appointments tab: a month grid (the plain, stable
 *  `Calendar`) with dotted days, over a scrollable list of the selected day's
 *  appointments. */
export function AppointmentsCalendar() {
  const { color } = useTheme();
  const router = useRouter();

  const today = isoDate(new Date());
  const [selected, setSelected] = useState(today);

  const { items, query } = useAppointmentItems('all');

  const byDay = useMemo(() => {
    const m = new Map<string, AppointmentListItem[]>();
    for (const a of items) {
      const k = a.scheduledStart.slice(0, 10);
      const arr = m.get(k);
      if (arr) arr.push(a);
      else m.set(k, [a]);
    }
    return m;
  }, [items]);

  const marked = useMemo<MarkedDates>(() => {
    const m: MarkedDates = {};
    for (const k of byDay.keys()) m[k] = { marked: true, dotColor: color.primary };
    m[selected] = {
      ...(m[selected] ?? {}),
      selected: true,
      selectedColor: color.primary,
      selectedTextColor: color['primary-foreground'],
    };
    return m;
  }, [byDay, selected, color]);

  const dayItems = useMemo(
    () =>
      [...(byDay.get(selected) ?? [])].sort((a, b) =>
        a.scheduledStart.localeCompare(b.scheduledStart),
      ),
    [byDay, selected],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppointmentListItem }) => (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/appointment/[id]',
            params: { id: item.id, name: item.counterpartyName },
          })
        }
      >
        <Card style={{ gap: 4 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <Text style={[mono('600'), { fontSize: 14, color: color.foreground }]}>
              {fmtTime(item.scheduledStart)}
            </Text>
            <StatusBadge status={item.status} />
          </View>
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
            with {item.counterpartyName}
            {item.reasonForVisit ? ` — ${item.reasonForVisit}` : ''}
          </Text>
        </Card>
      </Pressable>
    ),
    [color, router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <Calendar
        current={today}
        firstDay={1}
        enableSwipeMonths
        markedDates={marked}
        onDayPress={(d) => setSelected(d.dateString)}
        theme={calendarTheme(color)}
        style={{ borderBottomWidth: 1, borderBottomColor: color.border, paddingBottom: space.sm }}
      />
      <FlatList
        data={dayItems}
        keyExtractor={(a) => a.id}
        renderItem={renderItem}
        refreshing={query.isRefetching}
        onRefresh={() => void query.refetch()}
        contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
        ListHeaderComponent={
          <Text style={[t.label, { color: color['muted-foreground'], marginBottom: space.xs }]}>
            {fmtDayHeading(`${selected}T00:00:00`)}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={query.isLoading ? 'Loading…' : 'Nothing on this day'}
          />
        }
      />
    </View>
  );
}
