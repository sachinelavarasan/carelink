import { Linking, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useDoctor } from '@/hooks/useDoctors';
import { errMessage } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { color } = useTheme();
  const { data: d, isLoading, isError, error } = useDoctor(id);

  const line = { fontSize: 13, color: color['muted-foreground'] } as const;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Doctor', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 12 }}>
        {isLoading ? <Text style={line}>Loading…</Text> : null}
        {isError ? <Notice tone="danger">{errMessage(error, 'Doctor not found')}</Notice> : null}

        {d ? (
          <Card style={{ gap: 6 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: color.foreground }}>
              {d.fullName}
            </Text>
            <Text style={line}>
              {d.specializations.join(', ')} · {d.qualifications}
            </Text>
            <Text style={line}>
              {d.yearsExperience} years&apos; experience · consultation fee ₹{d.consultationFeeInr}
            </Text>
            {d.bio ? (
              <Text style={{ fontSize: 14, color: color.foreground, marginTop: 4 }}>{d.bio}</Text>
            ) : null}

            {d.clinicName || d.clinicAddress || d.clinicPhone || d.clinicMapUrl ? (
              <View
                style={{
                  marginTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: color.border,
                  paddingTop: 10,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                  {d.clinicName ?? 'Clinic'}
                </Text>
                {d.clinicAddress ? <Text style={line}>{d.clinicAddress}</Text> : null}
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
                  {d.clinicMapUrl ? (
                    <Pressable onPress={() => Linking.openURL(d.clinicMapUrl!)}>
                      <Text style={{ fontSize: 13, color: color.primary }}>Get directions</Text>
                    </Pressable>
                  ) : null}
                  {d.clinicPhone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${d.clinicPhone!.replace(/\s+/g, '')}`)}>
                      <Text style={{ fontSize: 13, color: color.primary }}>
                        <Ionicons name="call-outline" size={12} /> {d.clinicPhone}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}

            <Button
              label="Book a consultation"
              style={{ marginTop: 12 }}
              onPress={() => router.push(`/book?doctorId=${d.id}`)}
            />
          </Card>
        ) : null}
      </Screen>
    </>
  );
}
