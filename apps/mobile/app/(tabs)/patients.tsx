import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { useMyPatients } from '@/hooks/useMedicalHistory';
import { mono } from '@/lib/fonts';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Patients() {
  const router = useRouter();
  const { color } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useMyPatients();

  return (
    <Screen contentStyle={{ gap: 12 }} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <ScreenTitle>Patients</ScreenTitle>

      {isLoading ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
      ) : isError ? (
        <Notice tone="danger">Could not load patients.</Notice>
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No patients yet"
          subtitle="Patients you've consulted appear here."
        />
      ) : (
        data!.map((p) => (
          <Pressable
            key={p.id}
            onPress={() =>
              router.push({ pathname: '/patient/[id]/history', params: { id: p.id, name: p.fullName } })
            }
          >
            <Card style={{ flexDirection: 'row', gap: 12 }}>
              <Avatar name={p.fullName} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                  {p.fullName}
                </Text>
                <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                  {[p.gender, p.dob ? `DOB ${fmtDate(p.dob)}` : null].filter(Boolean).join(' · ')}
                </Text>
                <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                  last seen <Text style={mono('400')}>{fmtDate(p.lastVisitedAt)}</Text> · {p.visitCount}{' '}
                  visit{p.visitCount === 1 ? '' : 's'}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
