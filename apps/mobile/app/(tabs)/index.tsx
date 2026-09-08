import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { StatTile } from '@/components/StatTile';
import { StatusBadge } from '@/components/StatusBadge';
import { useAppointmentItems, useAppointmentSummary } from '@/hooks/useAppointments';
import { useMedicalHistory, useMyPatients } from '@/hooks/useMedicalHistory';
import { useAuth } from '@/lib/auth';
import { fmtDateTime, isToday, relativeDay } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Home() {
  const router = useRouter();
  const { me } = useAuth();
  const { color } = useTheme();

  const isDoctor = me?.user.role === 'DOCTOR';
  const summary = useAppointmentSummary();
  const { items, query: upcoming } = useAppointmentItems('upcoming');
  const { entries } = useMedicalHistory({ enabled: !isDoctor });
  const patients = useMyPatients(isDoctor);

  if (!me) return null;

  const profileComplete = isDoctor ? Boolean(me.doctorProfile) : Boolean(me.patientProfile);
  const schedule = isDoctor ? items.filter((a) => isToday(a.scheduledStart)) : items;
  const recentConsults = entries.filter((e) => e.prescription).slice(0, 3);
  const recentPatients = (patients.data ?? []).slice(0, 3);

  const heading = { fontSize: 15, fontWeight: '600' as const, color: color.foreground, marginTop: 24 };

  return (
    <Screen
      contentStyle={{ gap: 10 }}
      onRefresh={() => {
        void summary.refetch();
        void upcoming.refetch();
      }}
      refreshing={summary.isRefetching}
    >
      <Text style={{ fontSize: 20, fontWeight: '700', color: color.foreground }}>
        Hi, {me.user.fullName.split(' ')[0]}
      </Text>
      <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
        {me.user.role.toLowerCase()} · {me.user.email}
      </Text>

      {!profileComplete ? (
        <Notice tone="warning">
          Your profile isn&apos;t complete — open the Profile tab to finish it.
        </Notice>
      ) : null}
      {!isDoctor && (summary.data?.followUpsDue ?? 0) > 0 ? (
        <Notice tone="warning">
          {summary.data!.followUpsDue} follow-up{summary.data!.followUpsDue === 1 ? '' : 's'} due in
          the next two weeks.
        </Notice>
      ) : null}
      {isDoctor && (summary.data?.pendingRecords ?? 0) > 0 ? (
        <Notice tone="warning">
          {summary.data!.pendingRecords} draft prescription
          {summary.data!.pendingRecords === 1 ? '' : 's'} still to finish.
        </Notice>
      ) : null}

      {summary.data ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          <StatTile icon="today" label="Today" value={summary.data.today} />
          {isDoctor ? (
            <>
              <StatTile icon="calendar" label="Upcoming" value={summary.data.upcoming} />
              <StatTile icon="checkmark-done" label="Completed" value={summary.data.completed} />
              <StatTile icon="people" label="Patients" value={summary.data.counterpartiesSeen} />
            </>
          ) : (
            <>
              <StatTile
                icon="calendar"
                label="This week"
                value={summary.data.next7Days}
                hint={`${summary.data.upcoming} upcoming`}
              />
              <StatTile icon="checkmark-done" label="Consultations" value={summary.data.completed} />
              <StatTile icon="medkit" label="Doctors seen" value={summary.data.counterpartiesSeen} />
            </>
          )}
        </View>
      ) : null}

      <Text style={heading}>{isDoctor ? "Today's schedule" : 'Next up'}</Text>
      {upcoming.isLoading ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
      ) : schedule.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title={isDoctor ? 'Nothing scheduled today' : 'No upcoming appointments'}
          subtitle={isDoctor ? undefined : 'Book a consultation to see it here.'}
        />
      ) : (
        schedule.map((a) => (
          <Pressable
            key={a.id}
            onPress={() =>
              router.push({ pathname: '/appointment/[id]', params: { id: a.id, name: a.counterpartyName } })
            }
          >
            <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                  {relativeDay(a.scheduledStart)} · {fmtDateTime(a.scheduledStart)}
                </Text>
                <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                  with {a.counterpartyName}
                </Text>
              </View>
              <StatusBadge status={a.status} />
            </Card>
          </Pressable>
        ))
      )}

      {isDoctor && recentPatients.length > 0 ? (
        <>
          <Text style={heading}>Recent patients</Text>
          {recentPatients.map((p) => (
            <Card key={p.id}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                {p.fullName}
              </Text>
              <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                last seen {fmtDateTime(p.lastVisitedAt)} · {p.visitCount} visit
                {p.visitCount === 1 ? '' : 's'}
              </Text>
            </Card>
          ))}
        </>
      ) : null}

      {!isDoctor && recentConsults.length > 0 ? (
        <>
          <Text style={heading}>Recent consultations</Text>
          {recentConsults.map((e) => (
            <Card key={e.appointmentId}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                {fmtDateTime(e.scheduledStart)} · {e.doctorName}
              </Text>
              <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
                {e.prescription?.diagnosis}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
