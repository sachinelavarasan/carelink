import { Text } from 'react-native';
import { Stack } from 'expo-router';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { HistoryEntryCard } from '@/components/HistoryEntryCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { useMedicalHistory } from '@/hooks/useMedicalHistory';
import { useTheme } from '@/theme/ThemeProvider';

export default function MedicalHistoryScreen() {
  const { color } = useTheme();
  const { entries, query } = useMedicalHistory();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Medical history', headerBackTitle: 'Back' }} />
      <Screen
        contentStyle={{ gap: 12 }}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching && !query.isFetchingNextPage}
      >
        {query.isLoading ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
        ) : query.isError ? (
          <Notice tone="danger">Could not load the history.</Notice>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="document-text-outline"
            title="No consultations yet"
            subtitle="Your consultations and prescriptions will appear here."
          />
        ) : (
          entries.map((e) => <HistoryEntryCard key={e.appointmentId} entry={e} who="patient" />)
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
