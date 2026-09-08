import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatusBadge } from '@/components/StatusBadge';
import { type AppointmentScope, useAppointmentItems } from '@/hooks/useAppointments';
import { useAuth } from '@/lib/auth';
import { fmtDateTime, relativeDay } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const SCOPES: { value: AppointmentScope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'all', label: 'All' },
];

export default function Appointments() {
  const router = useRouter();
  const { color } = useTheme();
  const { me } = useAuth();
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const { items, query } = useAppointmentItems(scope);

  const isPatient = me?.user.role === 'PATIENT';

  return (
    <Screen
      contentStyle={{ gap: 12 }}
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: color.foreground }}>Appointments</Text>
      <SegmentedControl options={SCOPES} value={scope} onChange={setScope} />

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
              router.push({ pathname: '/appointment/[id]', params: { id: a.id, name: a.counterpartyName } })
            }
          >
            <Card style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground, flex: 1 }}>
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
  );
}
