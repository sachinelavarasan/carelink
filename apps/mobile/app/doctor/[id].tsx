import { Linking, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useDoctor } from '@/hooks/useDoctors';
import { errMessage } from '@/lib/api';
import { mono } from '@/lib/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

export default function DoctorDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { color } = useTheme();
  const { data: d, isLoading, isError, error } = useDoctor(id);

  const line = { fontSize: 13, color: color['muted-foreground'] } as const;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Doctor" />
      <Screen contentStyle={{ gap: 12 }}>
        {isLoading ? <Text style={line}>Loading…</Text> : null}
        {isError ? <Notice tone="danger">{errMessage(error, 'Doctor not found')}</Notice> : null}

        {d ? (
          <>
            <Card elevated style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Avatar name={d.fullName} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: color.foreground }}>
                    {d.fullName}
                  </Text>
                  <Text style={line}>
                    {d.specializations.join(', ')} · {d.qualifications}
                  </Text>
                </View>
              </View>
              <Text style={line}>
                <Text style={mono('500')}>{d.yearsExperience}</Text> years&apos; experience ·
                consultation fee{' '}
                <Text style={[mono('500'), { color: color.foreground }]}>₹{d.consultationFeeInr}</Text>
              </Text>
              {d.bio ? (
                <Text style={{ fontSize: 14, lineHeight: 20, color: color.foreground, marginTop: 2 }}>
                  {d.bio}
                </Text>
              ) : null}

              {d.clinicName || d.clinicAddress || d.clinicPhone || d.clinicMapUrl ? (
                <View
                  style={{
                    marginTop: 6,
                    borderTopWidth: 1,
                    borderTopColor: color.border,
                    paddingTop: 10,
                    flexDirection: 'row',
                    gap: 10,
                  }}
                >
                  <Ionicons name="location-outline" size={18} color={color.primary} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                      {d.clinicName ?? 'Clinic'}
                    </Text>
                    {d.clinicAddress ? <Text style={line}>{d.clinicAddress}</Text> : null}
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>
                      {d.clinicMapUrl ? (
                        <Pressable onPress={() => Linking.openURL(d.clinicMapUrl!)}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: color.primary }}>
                            Get directions
                          </Text>
                        </Pressable>
                      ) : null}
                      {d.clinicPhone ? (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${d.clinicPhone!.replace(/\s+/g, '')}`)}
                        >
                          <Text style={[mono('500'), { fontSize: 13, color: color.primary }]}>
                            {d.clinicPhone}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : null}
            </Card>

            <Button
              label="Book a consultation"
              style={{ marginTop: space.xs }}
              onPress={() => router.push(`/book?doctorId=${d.id}`)}
            />
          </>
        ) : null}
      </Screen>
    </>
  );
}
