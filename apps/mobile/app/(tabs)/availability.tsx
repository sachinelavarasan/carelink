import type { AvailabilityRuleInput } from '@carelink/shared';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { RowDatePicker } from '@/components/RowDatePicker';
import { RowSelect } from '@/components/RowSelect';
import { RowTimePicker } from '@/components/RowTimePicker';
import { Screen } from '@/components/Screen';
import { Switch } from '@/components/Switch';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useCloseRange,
  useDeleteException,
  useMyExceptions,
  useMyRules,
  useReplaceRules,
  useUpsertException,
} from '@/hooks/useAvailability';
import { errMessage } from '@/lib/api';
import { fmtDate, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LENGTHS = [10, 15, 20, 30, 45, 60].map((n) => ({ label: `${n} min`, value: String(n) }));

interface DayRow {
  enabled: boolean;
  start: string;
  end: string;
}
const emptyDay = (): DayRow => ({ enabled: false, start: '09:00', end: '17:00' });

export default function Availability() {
  const { color } = useTheme();
  const confirm = useConfirm();

  const rulesQ = useMyRules();
  const exceptionsQ = useMyExceptions();
  const replace = useReplaceRules();
  const upsertException = useUpsertException();
  const deleteException = useDeleteException();
  const closeRange = useCloseRange();

  const [length, setLength] = useState('30');
  const [days, setDays] = useState<DayRow[]>(() => DAYS.map(emptyDay));
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newExDate, setNewExDate] = useState('');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  // Seed from the saved template once.
  if (rulesQ.data && !hydrated) {
    const rows = DAYS.map(emptyDay);
    for (const r of rulesQ.data) {
      rows[r.weekday] = { enabled: true, start: r.startTime, end: r.endTime };
    }
    setDays(rows);
    setLength(String(rulesQ.data[0]?.slotMinutes ?? 30));
    setHydrated(true);
  }

  const invalid = useMemo(
    () => days.some((d) => d.enabled && d.end <= d.start),
    [days],
  );

  const setDay = (i: number, patch: Partial<DayRow>) =>
    setDays((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  async function saveRules() {
    setError(null);
    if (invalid) {
      setError('Each open day needs an end time after its start time.');
      return;
    }
    const from = isoDate(new Date());
    const rules: AvailabilityRuleInput[] = days
      .map((d, weekday) =>
        d.enabled
          ? {
              weekday,
              startTime: d.start,
              endTime: d.end,
              slotMinutes: Number(length),
              effectiveFrom: from,
            }
          : null,
      )
      .filter((r): r is AvailabilityRuleInput => r !== null);
    try {
      await replace.mutateAsync({ rules });
      showToast({ type: 'success', text1: 'Weekly hours saved' });
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  async function addClosedDay() {
    if (!newExDate) return;
    try {
      await upsertException.mutateAsync({ date: newExDate, isClosed: true });
      setNewExDate('');
      showToast({ type: 'success', text1: 'Day marked closed' });
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not save') });
    }
  }

  async function closeDates() {
    if (!rangeFrom || !rangeTo) return;
    if (rangeTo < rangeFrom) {
      showToast({ type: 'error', text1: '"To" must be on or after "From"' });
      return;
    }
    try {
      await closeRange.mutateAsync({ from: rangeFrom, to: rangeTo, isClosed: true });
      setRangeFrom('');
      setRangeTo('');
      showToast({ type: 'success', text1: 'Leave block saved' });
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not save') });
    }
  }

  async function removeException(id: string) {
    if ((await confirm({ title: 'Remove this override?', confirmLabel: 'Remove', destructive: true })) === false) {
      return;
    }
    try {
      await deleteException.mutateAsync(id);
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not remove') });
    }
  }

  return (
    <Screen contentStyle={{ gap: 14 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: color.foreground }}>Availability</Text>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Card>
        <RowSelect
          label="Slot length"
          options={LENGTHS}
          value={length}
          onChange={setLength}
          showDivider={false}
        />
      </Card>

      <Card style={{ gap: 4 }}>
        {days.map((d, i) => (
          <View
            key={DAYS[i]}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 8,
              borderBottomWidth: i < 6 ? 1 : 0,
              borderBottomColor: color.border,
            }}
          >
            <Switch value={d.enabled} onChange={(v) => setDay(i, { enabled: v })} />
            <Text style={{ width: 84, fontSize: 13, fontWeight: '600', color: color.foreground }}>
              {DAYS[i].slice(0, 3)}
            </Text>
            {d.enabled ? (
              <View style={{ flex: 1, flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <RowTimePicker
                    value={d.start}
                    onChange={(v) => setDay(i, { start: v })}
                    showDivider={false}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <RowTimePicker
                    value={d.end}
                    onChange={(v) => setDay(i, { end: v })}
                    showDivider={false}
                  />
                </View>
              </View>
            ) : (
              <Text style={{ flex: 1, fontSize: 12, color: color['muted-foreground'] }}>Closed</Text>
            )}
          </View>
        ))}
      </Card>

      <Button label="Save weekly hours" busy={replace.isPending} onPress={saveRules} />

      {/* date overrides */}
      <Text style={{ fontSize: 15, fontWeight: '700', color: color.foreground, marginTop: 8 }}>
        Date overrides
      </Text>
      {(exceptionsQ.data ?? []).length === 0 ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>No overrides.</Text>
      ) : (
        (exceptionsQ.data ?? []).map((ex) => (
          <Card
            key={ex.id}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <Text style={{ fontSize: 13, color: color.foreground }}>
              {fmtDate(ex.date)} · {ex.isClosed ? 'Closed' : `${ex.startTime}–${ex.endTime}`}
            </Text>
            <Ionicons
              name="trash-outline"
              size={17}
              color={color.destructive}
              onPress={() => removeException(ex.id)}
            />
          </Card>
        ))
      )}

      <RowDatePicker
        label="Mark a single day closed"
        value={newExDate}
        onChange={setNewExDate}
        minimumDate={new Date()}
        placeholder="Pick a date"
      />
      <Button
        label="Add closed day"
        variant="outline"
        disabled={!newExDate}
        busy={upsertException.isPending}
        onPress={addClosedDay}
      />

      <Text style={{ fontSize: 15, fontWeight: '700', color: color.foreground, marginTop: 8 }}>
        Holiday / leave block
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <RowDatePicker label="From" value={rangeFrom} onChange={setRangeFrom} minimumDate={new Date()} />
        </View>
        <View style={{ flex: 1 }}>
          <RowDatePicker label="To" value={rangeTo} onChange={setRangeTo} minimumDate={new Date()} />
        </View>
      </View>
      <Button
        label="Close these dates"
        variant="outline"
        disabled={!rangeFrom || !rangeTo}
        busy={closeRange.isPending}
        onPress={closeDates}
      />
    </Screen>
  );
}
