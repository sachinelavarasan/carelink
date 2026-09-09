import type { AvailabilityRuleInput } from '@carelink/shared';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Notice } from '@/components/Notice';
import { RowDatePicker } from '@/components/RowDatePicker';
import { RowSelect } from '@/components/RowSelect';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { SectionLabel } from '@/components/SectionLabel';
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
import { mono } from '@/lib/fonts';
import { fmtDate, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LENGTHS = [10, 15, 20, 30, 45, 60].map((n) => ({ label: `${n} min`, value: String(n) }));

/** 06:00 → 22:00 in 30-min steps, `HH:mm` value + 12-hour label. */
const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => {
  const mins = 6 * 60 + i * 30;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const hh = `${h}`.padStart(2, '0');
  const mm = `${m}`.padStart(2, '0');
  const h12 = ((h + 11) % 12) + 1;
  return { value: `${hh}:${mm}`, label: `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}` };
});

interface DayRow {
  enabled: boolean;
  start: string;
  end: string;
  slotMinutes: number;
}
const emptyDay = (): DayRow => ({ enabled: false, start: '09:00', end: '17:00', slotMinutes: 30 });

export default function Availability() {
  const { color } = useTheme();
  const confirm = useConfirm();

  const rulesQ = useMyRules();
  const exceptionsQ = useMyExceptions();
  const replace = useReplaceRules();
  const upsertException = useUpsertException();
  const deleteException = useDeleteException();
  const closeRange = useCloseRange();

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
      rows[r.weekday] = {
        enabled: true,
        start: r.startTime,
        end: r.endTime,
        slotMinutes: r.slotMinutes,
      };
    }
    setDays(rows);
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
              slotMinutes: d.slotMinutes,
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
      <ScreenTitle>Availability</ScreenTitle>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <SectionLabel first>Weekly hours</SectionLabel>
      <Text style={{ fontSize: 13, color: color['muted-foreground'], marginTop: -4 }}>
        Set the open hours and appointment slot length for each day.
      </Text>
      {days.map((d, i) => {
        const badRange = d.enabled && d.end <= d.start;
        return (
          <Card key={DAYS[i]} style={{ gap: d.enabled ? 12 : 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Switch value={d.enabled} onChange={(v) => setDay(i, { enabled: v })} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: color.foreground }}>
                {DAYS[i]}
              </Text>
              {d.enabled ? (
                <Text style={[mono('500'), { fontSize: 12, color: color['muted-foreground'] }]}>
                  {d.start}–{d.end} · {d.slotMinutes}m
                </Text>
              ) : (
                <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Closed</Text>
              )}
            </View>

            {d.enabled ? (
              <View>
                <RowSelect
                  label="Start"
                  sheetTitle={`${DAYS[i]} · start time`}
                  options={TIME_OPTIONS}
                  value={d.start}
                  onChange={(v) => setDay(i, { start: v })}
                />
                <RowSelect
                  label="End"
                  sheetTitle={`${DAYS[i]} · end time`}
                  options={TIME_OPTIONS}
                  value={d.end}
                  onChange={(v) => setDay(i, { end: v })}
                  error={badRange ? 'End must be after start' : null}
                />
                <RowSelect
                  label="Slot length"
                  sheetTitle={`${DAYS[i]} · slot length`}
                  options={LENGTHS}
                  value={String(d.slotMinutes)}
                  onChange={(v) => setDay(i, { slotMinutes: Number(v) })}
                  showDivider={false}
                />
              </View>
            ) : null}
          </Card>
        );
      })}

      <Button label="Save weekly hours" busy={replace.isPending} onPress={saveRules} />

      {/* date overrides */}
      <SectionLabel>Date overrides</SectionLabel>
      {(exceptionsQ.data ?? []).length === 0 ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>No overrides.</Text>
      ) : (
        (exceptionsQ.data ?? []).map((ex) => (
          <Card
            key={ex.id}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
          >
            <Text style={[mono('400'), { fontSize: 13, color: color.foreground }]}>
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

      <SectionLabel>Holiday / leave block</SectionLabel>
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
