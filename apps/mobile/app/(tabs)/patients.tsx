import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useMyPatients } from '@/hooks/useMedicalHistory';
import { fmtDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

export default function Patients() {
  const router = useRouter();
  const { color } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useMyPatients();

  return (
    <Screen contentStyle={{ gap: 12 }} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: color.foreground }}>Patients</Text>

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
            <Card style={{ gap: 3 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: color.foreground }}>
                {p.fullName}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {p.gender ? (
                  <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>{p.gender}</Text>
                ) : null}
                {p.dob ? (
                  <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                    DOB {fmtDate(p.dob)}
                  </Text>
                ) : null}
              </View>
              <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                last seen {fmtDate(p.lastVisitedAt)} · {p.visitCount} visit
                {p.visitCount === 1 ? '' : 's'}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
