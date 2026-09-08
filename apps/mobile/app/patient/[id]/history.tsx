import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { HistoryEntryCard } from '@/components/HistoryEntryCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { VitalsSummary } from '@/components/VitalsSummary';
import { usePatientHistory } from '@/hooks/useMedicalHistory';
import { usePatientVitals } from '@/hooks/useVitals';
import { useTheme } from '@/theme/ThemeProvider';

export default function PatientHistory() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { color } = useTheme();
  const { entries, query } = usePatientHistory(id);
  const vitals = usePatientVitals(id);

  return (
    <>
      <Stack.Screen
        options={{ headerShown: true, title: name ?? 'Patient history', headerBackTitle: 'Back' }}
      />
      <Screen
        contentStyle={{ gap: 12 }}
        onRefresh={() => {
          void query.refetch();
          void vitals.refetch();
        }}
        refreshing={query.isRefetching}
      >
        {vitals.data && vitals.data.length > 0 ? (
          <Card style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: color.foreground }}>
              Patient-logged vitals
            </Text>
            <VitalsSummary items={vitals.data} />
          </Card>
        ) : null}

        {query.isLoading ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
        ) : query.isError ? (
          <Notice tone="danger">Could not load the history.</Notice>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No consultations"
            subtitle="This patient has no past consultations with you."
          />
        ) : (
          <View style={{ gap: 12 }}>
            {entries.map((e) => (
              <HistoryEntryCard key={e.appointmentId} entry={e} who="doctor" />
            ))}
          </View>
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
    </>
  );
}
