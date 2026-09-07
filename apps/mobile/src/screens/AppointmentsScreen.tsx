import type { AppointmentListItem, AppointmentPage } from '@carelink/shared';
import { appointmentStatusMeta } from '@carelink/theme';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { api, errMessage } from '../lib/api';
import { cn } from '../lib/cn';
import { fmtDateTime } from '../lib/format';

type Scope = 'upcoming' | 'past';

const badgeClass: Record<string, string> = {
  success: 'bg-success-bg border-success-border text-success-fg',
  warning: 'bg-warning-bg border-warning-border text-warning-fg',
  danger: 'bg-danger-bg border-danger-border text-danger-fg',
  neutral: 'bg-muted border-border text-muted-foreground',
};

export function AppointmentsScreen() {
  const [scope, setScope] = useState<Scope>('upcoming');
  const [items, setItems] = useState<AppointmentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AppointmentPage>('/appointments', { params: { scope } });
      setItems(data.items);
    } catch (err) {
      Alert.alert('Error', errMessage(err, 'Could not load appointments'));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  function cancel(id: string) {
    Alert.prompt?.('Cancel appointment', 'Reason?', async (reason?: string) => {
      if (!reason || reason.trim().length < 3) return;
      try {
        await api.post(`/appointments/${id}/cancel`, { reason: reason.trim() });
        void load();
      } catch (err) {
        Alert.alert('Error', errMessage(err, 'Could not cancel'));
      }
    });
  }

  return (
    <View className="flex-1">
      <View className="flex-row gap-2 p-4">
        {(['upcoming', 'past'] as Scope[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            className={cn(
              'rounded-full border px-4 py-1.5',
              scope === s ? 'border-primary bg-primary' : 'border-border',
            )}
          >
            <Text className={scope === s ? 'text-primary-foreground' : 'text-muted-foreground'}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerClassName="gap-3 px-4 pb-4"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {!loading && items.length === 0 && (
          <Text className="text-sm text-muted-foreground">Nothing here.</Text>
        )}
        {items.map((a) => {
          const meta = appointmentStatusMeta[a.status];
          return (
            <View key={a.id} className="gap-1 rounded-lg border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-medium text-card-foreground">
                  {fmtDateTime(a.scheduledStart)}
                </Text>
                <Text className={cn('rounded-full border px-2 py-0.5 text-xs', badgeClass[meta.variant])}>
                  {meta.label}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">with {a.counterpartyName}</Text>
              {a.reasonForVisit ? (
                <Text className="text-sm text-muted-foreground">{a.reasonForVisit}</Text>
              ) : null}
              {scope === 'upcoming' && a.status === 'CONFIRMED' && (
                <Pressable onPress={() => cancel(a.id)}>
                  <Text className="mt-1.5 text-sm text-destructive">Cancel</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
