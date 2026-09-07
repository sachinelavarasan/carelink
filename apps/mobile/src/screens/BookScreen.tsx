import type { DoctorPublic, Slot } from '@carelink/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { api, errMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { fmtDayHeading, fmtTime, isoDate } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';

function groupByDay(slots: Slot[]): [string, Slot[]][] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = s.start.slice(0, 10);
    const arr = map.get(key);
    if (arr) arr.push(s);
    else map.set(key, [s]);
  }
  return [...map.entries()];
}

export function BookScreen({ onBooked }: { onBooked: () => void }) {
  const { color } = useTheme();
  const [doctor, setDoctor] = useState<DoctorPublic | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: doctors } = await api.get<DoctorPublic[]>('/doctors');
        const doc = doctors[0] ?? null;
        setDoctor(doc);
        if (doc) {
          const from = isoDate(new Date());
          const to = isoDate(new Date(Date.now() + 13 * 86_400_000));
          const { data } = await api.get<Slot[]>(`/doctors/${doc.id}/slots`, { params: { from, to } });
          setSlots(data);
        }
      } catch (err) {
        Alert.alert('Error', errMessage(err, 'Could not load slots'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function book() {
    if (!doctor || !picked) return;
    setBusy(true);
    try {
      await api.post('/appointments', {
        doctorId: doctor.id,
        scheduledStart: picked.start,
        reasonForVisit: reason,
        consentAccepted: true,
      });
      onBooked();
    } catch (err) {
      Alert.alert('Error', errMessage(err, 'Could not book'));
      setBusy(false);
    }
  }

  if (loading) return <ActivityIndicator className="mt-10" color={color.primary} />;
  if (!doctor) {
    return <Text className="p-4 text-sm text-muted-foreground">No doctor is available yet.</Text>;
  }

  const days = groupByDay(slots);
  const canBook = !busy && consent && reason.trim().length >= 3;

  return (
    <ScrollView contentContainerClassName="p-4">
      <Text className="text-lg font-bold text-foreground">{doctor.fullName}</Text>
      <Text className="mt-1 text-sm text-muted-foreground">
        {doctor.specializations.join(', ')} · ₹{doctor.consultationFeeInr}
      </Text>

      {days.length === 0 && (
        <Text className="mt-3 text-sm text-muted-foreground">
          No open slots in the next two weeks.
        </Text>
      )}

      {days.map(([day, daySlots]) => (
        <View key={day} className="mt-4">
          <Text className="mb-1.5 text-sm text-muted-foreground">
            {fmtDayHeading(daySlots[0].start)}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {daySlots.map((s) => (
              <Pressable
                key={s.start}
                onPress={() => setPicked(s)}
                className={cn(
                  'rounded-md border px-3 py-1.5',
                  picked?.start === s.start ? 'border-primary bg-primary' : 'border-border',
                )}
              >
                <Text
                  className={cn(
                    'text-sm',
                    picked?.start === s.start ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {fmtTime(s.start)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}

      {picked && (
        <View className="mt-6 gap-3">
          <TextInput
            className="min-h-16 rounded-md border border-input bg-background p-3 text-base text-foreground"
            placeholder="Reason for visit"
            placeholderTextColor={color['muted-foreground']}
            multiline
            value={reason}
            onChangeText={setReason}
          />
          <View className="flex-row items-center gap-2.5">
            <Switch value={consent} onValueChange={setConsent} />
            <Text className="flex-1 text-sm text-muted-foreground">
              I consent to a teleconsultation and confirm my details are accurate.
            </Text>
          </View>
          <Pressable
            className={cn('items-center rounded-md bg-primary p-3.5', !canBook && 'opacity-50')}
            disabled={!canBook}
            onPress={book}
          >
            <Text className="font-semibold text-primary-foreground">
              {busy ? 'Booking…' : `Confirm ${fmtTime(picked.start)}`}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
