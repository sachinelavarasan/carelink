import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import { AppointmentsCalendar } from '@/components/AppointmentsCalendar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { StatusBadge } from '@/components/StatusBadge';
import { type AppointmentScope, useAppointmentItems } from '@/hooks/useAppointments';
import { useAuth } from '@/lib/auth';
import { mono } from '@/lib/fonts';
import { fmtDateTime, relativeDay } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';
import { elevation, radius, space } from '@/theme/tokens';

const SCOPES: { value: AppointmentScope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default function Appointments() {
  const router = useRouter();
  const { color } = useTheme();
  const { me } = useAuth();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const { items, query } = useAppointmentItems(scope);

  const isPatient = me?.user.role === 'PATIENT';

  return (
    <View style={{ flex: 1, backgroundColor: color.background }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
        {/* title + segmented icon toggle for the two views */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <ScreenTitle>Appointments</ScreenTitle>
          <View
            style={{
              flexDirection: 'row',
              gap: 2,
              padding: 3,
              borderRadius: radius.sm,
              backgroundColor: color.muted,
            }}
          >
            {(['list', 'calendar'] as const).map((v) => {
              const on = view === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setView(v)}
                  accessibilityRole="button"
                  accessibilityLabel={`${v} view`}
                  accessibilityState={{ selected: on }}
                  style={[
                    {
                      width: 40,
                      height: 30,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: radius.sm - 2,
                      backgroundColor: on ? color.card : 'transparent',
                    },
                    on && elevation.card,
                  ]}
                >
                  <Ionicons
                    name={v === 'list' ? 'reorder-three-outline' : 'calendar-outline'}
                    size={19}
                    color={on ? color.primary : color['muted-foreground']}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* scope filter — chips, only in list view */}
        {view === 'list' ? (
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            {SCOPES.map((s) => {
              const on = scope === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setScope(s.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: on ? color.primary : color.border,
                    backgroundColor: on ? color.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: on ? color['primary-foreground'] : color['muted-foreground'],
                    }}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      {view === 'calendar' ? (
        <AppointmentsCalendar />
      ) : (
        <Screen
          contentStyle={{ gap: 12 }}
          onRefresh={() => void query.refetch()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
        >
          {query.isLoading ? (
            <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
          ) : items.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={scope === 'upcoming' ? 'No upcoming appointments' : 'Nothing here'}
              subtitle={
                scope === 'upcoming' && isPatient ? 'Book a consultation to see it here.' : undefined
              }
            >
              {scope === 'upcoming' && isPatient ? (
                <Button label="Find a doctor" onPress={() => router.push('/(tabs)/doctors')} />
              ) : undefined}
            </EmptyState>
          ) : (
            items.map((a) => (
              <Pressable
                key={a.id}
                onPress={() =>
                  router.push({
                    pathname: '/appointment/[id]',
                    params: { id: a.id, name: a.counterpartyName },
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
                    <Text style={[mono('500'), { fontSize: 13, color: color.foreground, flex: 1 }]}>
                      {relativeDay(a.scheduledStart)} · {fmtDateTime(a.scheduledStart)}
                    </Text>
                    <StatusBadge status={a.status} />
                  </View>
                  <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                    with {a.counterpartyName}
                    {a.reasonForVisit ? ` — ${a.reasonForVisit}` : ''}
                  </Text>
                </Card>
              </Pressable>
            ))
          )}

          {query.hasNextPage ? (
            <Button
              label={query.isFetchingNextPage ? 'Loading…' : 'Load more'}
              variant="outline"
              busy={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          ) : null}
        </Screen>
      )}
    </View>
  );
}
