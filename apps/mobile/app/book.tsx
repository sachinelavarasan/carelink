import type { Slot } from '@carelink/shared';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import type { MarkedDates } from 'react-native-calendars/src/types';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Switch } from '@/components/Switch';
import { showToast } from '@/components/ToastMessage';
import { useAppointment, useBookAppointment, useRescheduleAppointment } from '@/hooks/useAppointments';
import { useDoctor } from '@/hooks/useDoctors';
import { useDoctorSlots } from '@/hooks/useAvailability';
import { errMessage } from '@/lib/api';
import { calendarTheme } from '@/lib/calendarTheme';
import { mono } from '@/lib/fonts';
import { fmtDayHeading, fmtTime, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

function groupByDay(slots: Slot[]): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = s.start.slice(0, 10);
    const arr = map.get(k);
    if (arr) arr.push(s);
    else map.set(k, [s]);
  }
  return map;
}

export default function Book() {
  const router = useRouter();
  const { color } = useTheme();
  const params = useLocalSearchParams<{ doctorId?: string; reschedule?: string; date?: string }>();
  const rescheduleId = params.reschedule;

  const reschedApptQ = useAppointment(rescheduleId);
  const doctorId = rescheduleId ? reschedApptQ.data?.doctorId : params.doctorId;
  const doctorQ = useDoctor(doctorId);

  const from = isoDate(new Date());
  const focusDate = params.date && params.date >= from ? params.date : null;
  const to = useMemo(() => {
    if (focusDate) {
      const end = Math.min(
        Date.parse(`${focusDate}T00:00:00Z`) + 7 * 86_400_000,
        Date.parse(`${from}T00:00:00Z`) + 59 * 86_400_000,
      );
      return isoDate(new Date(end));
    }
    return isoDate(new Date(Date.now() + 13 * 86_400_000));
  }, [focusDate, from]);

  const slotsQ = useDoctorSlots(doctorId, from, to);
  const byDay = useMemo(() => groupByDay(slotsQ.data ?? []), [slotsQ.data]);
  const slotDays = useMemo(() => [...byDay.keys()].sort(), [byDay]);

  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const book = useBookAppointment();
  const reschedule = useRescheduleAppointment(rescheduleId ?? '');
  const busy = book.isPending || reschedule.isPending;

  // First render with data: land on the focus date (if it has slots) or the
  // earliest day with a free slot.
  const activeDay = day ?? (focusDate && byDay.has(focusDate) ? focusDate : slotDays[0] ?? null);
  const daySlots = activeDay ? (byDay.get(activeDay) ?? []) : [];

  const marked = useMemo<MarkedDates>(() => {
    const m: MarkedDates = {};
    for (const d of slotDays) m[d] = { marked: true, dotColor: color.primary };
    if (activeDay) {
      m[activeDay] = {
        ...(m[activeDay] ?? {}),
        selected: true,
        selectedColor: color.primary,
      };
    }
    return m;
  }, [slotDays, activeDay, color.primary]);

  if (!rescheduleId && !params.doctorId) return <Redirect href="/(tabs)/doctors" />;

  const doctor = doctorQ.data;
  const canSubmit = Boolean(picked) && (rescheduleId ? true : consent && reason.trim().length >= 3);

  async function submit() {
    if (!picked) return;
    setError(null);
    try {
      if (rescheduleId) {
        await reschedule.mutateAsync({ scheduledStart: picked.start });
      } else {
        await book.mutateAsync({
          doctorId: doctorId!,
          scheduledStart: picked.start,
          reasonForVisit: reason.trim(),
          consentAccepted: true,
        });
      }
      showToast({ type: 'success', text1: rescheduleId ? 'Appointment rescheduled' : 'Appointment booked' });
      router.replace('/(tabs)/appointments');
    } catch (err) {
      setError(errMessage(err, 'Could not book that slot'));
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={rescheduleId ? 'Reschedule' : 'Book'} />
      <Screen contentStyle={{ gap: 12 }}>
        {doctorQ.isLoading || reschedApptQ.isLoading ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
        ) : null}
        {doctorQ.isError ? (
          <Notice tone="danger">{errMessage(doctorQ.error, 'Could not load this doctor.')}</Notice>
        ) : null}

        {doctor ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>
            {doctor.fullName} · {doctor.specializations.join(', ')} ·{' '}
            <Text style={mono('500')}>₹{doctor.consultationFeeInr}</Text>
          </Text>
        ) : null}

        {focusDate ? (
          <Notice tone="info">
            Your prescription suggested a follow-up around {fmtDayHeading(focusDate)}. Pick whichever
            slot works.
          </Notice>
        ) : null}
        {error ? <Notice tone="danger">{error}</Notice> : null}

        {slotsQ.isLoading ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading slots…</Text>
        ) : slotDays.length === 0 ? (
          <Notice tone="warning">No open slots in this window.</Notice>
        ) : (
          <>
            <Card style={{ padding: 6 }}>
              <Calendar
                minDate={from}
                maxDate={to}
                current={activeDay ?? from}
                firstDay={1}
                markedDates={marked}
                onDayPress={(d) => {
                  if (!byDay.has(d.dateString)) return; // only days with free slots
                  setDay(d.dateString);
                  setPicked(null);
                }}
                theme={calendarTheme(color)}
                style={{ paddingBottom: 4 }}
              />
            </Card>

            {activeDay ? (
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: color.foreground }}>
                  {fmtDayHeading(`${activeDay}T00:00:00`)}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {daySlots.map((s) => {
                    const active = picked?.start === s.start;
                    return (
                      <Pressable
                        key={s.start}
                        onPress={() => setPicked(s)}
                        style={{
                          borderRadius: 10,
                          borderWidth: 1,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderColor: active ? color.primary : color.border,
                          backgroundColor: active ? color.primary : 'transparent',
                        }}
                      >
                        <Text
                          style={[
                            mono('500'),
                            {
                              fontSize: 13,
                              color: active ? color['primary-foreground'] : color.foreground,
                            },
                          ]}
                        >
                          {fmtTime(s.start)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </>
        )}

        {picked ? (
          <View style={{ gap: 12, marginTop: 8 }}>
            {!rescheduleId ? (
              <>
                <Field
                  label="Reason for visit"
                  placeholder="Briefly, what's the consultation about?"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Switch value={consent} onChange={setConsent} />
                  <Text style={{ flex: 1, fontSize: 13, color: color['muted-foreground'] }}>
                    I consent to a teleconsultation and confirm the information I provide is accurate.
                  </Text>
                </View>
              </>
            ) : null}
            <Button
              label={busy ? 'Saving…' : `Confirm ${fmtTime(picked.start)}`}
              busy={busy}
              disabled={!canSubmit}
              onPress={submit}
            />
          </View>
        ) : null}
      </Screen>
    </>
  );
}
