import type { VitalEntryInput } from '@carelink/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RowDatePicker } from '@/components/RowDatePicker';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { ModalCard } from '@/components/ModalCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { showToast } from '@/components/ToastMessage';
import { VitalsSummary } from '@/components/VitalsSummary';
import { useConfirm } from '@/hooks/useConfirm';
import { useAddVital, useDeleteVital, useMyVitals } from '@/hooks/useVitals';
import { errMessage } from '@/lib/api';
import { mono } from '@/lib/fonts';
import { fmtDateTime, isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

type FormKey = 'weightKg' | 'systolic' | 'diastolic' | 'heartRate' | 'bloodSugarMgDl' | 'temperatureC';
const FIELDS: { key: FormKey; label: string; decimal?: boolean }[] = [
  { key: 'weightKg', label: 'Weight (kg)', decimal: true },
  { key: 'systolic', label: 'BP systolic' },
  { key: 'diastolic', label: 'BP diastolic' },
  { key: 'heartRate', label: 'Heart rate (bpm)' },
  { key: 'bloodSugarMgDl', label: 'Blood sugar (mg/dL)', decimal: true },
  { key: 'temperatureC', label: 'Temperature (°C)', decimal: true },
];

export default function Vitals() {
  const { color } = useTheme();
  const confirm = useConfirm();
  const { data: items = [], isLoading, refetch, isRefetching } = useMyVitals();
  const add = useAddVital();
  const del = useDeleteVital();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<FormKey, string>>({
    weightKg: '',
    systolic: '',
    diastolic: '',
    heartRate: '',
    bloodSugarMgDl: '',
    temperatureC: '',
  });
  const [recordedAt, setRecordedAt] = useState(isoDate(new Date()));
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sorted = [...items].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  function reset() {
    setForm({ weightKg: '', systolic: '', diastolic: '', heartRate: '', bloodSugarMgDl: '', temperatureC: '' });
    setRecordedAt(isoDate(new Date()));
    setNotes('');
    setError(null);
  }

  async function save() {
    const payload: VitalEntryInput = { recordedAt: new Date(`${recordedAt}T12:00:00`).toISOString() };
    for (const { key } of FIELDS) {
      const n = Number(form[key]);
      if (form[key].trim() && Number.isFinite(n)) (payload as Record<string, unknown>)[key] = n;
    }
    if (notes.trim()) payload.notes = notes.trim();
    if (FIELDS.every(({ key }) => payload[key as keyof VitalEntryInput] == null)) {
      setError('Enter at least one measurement.');
      return;
    }
    try {
      await add.mutateAsync(payload);
      showToast({ type: 'success', text1: 'Vital logged' });
      setOpen(false);
      reset();
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  async function remove(id: string) {
    if ((await confirm({ title: 'Delete this entry?', destructive: true, confirmLabel: 'Delete' })) === false) return;
    try {
      await del.mutateAsync(id);
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not delete') });
    }
  }

  const metricLine = (v: (typeof items)[number]) => {
    const parts: string[] = [];
    if (v.weightKg != null) parts.push(`${v.weightKg} kg`);
    if (v.systolic != null && v.diastolic != null) parts.push(`${v.systolic}/${v.diastolic}`);
    if (v.heartRate != null) parts.push(`${v.heartRate} bpm`);
    if (v.bloodSugarMgDl != null) parts.push(`${v.bloodSugarMgDl} mg/dL`);
    if (v.temperatureC != null) parts.push(`${v.temperatureC} °C`);
    return parts.join(' · ');
  };

  return (
    <Screen contentStyle={{ gap: 12 }} onRefresh={() => void refetch()} refreshing={isRefetching}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <ScreenTitle>Vitals</ScreenTitle>
        <Button label="Log" size="sm" onPress={() => setOpen(true)} />
      </View>

      {items.length > 0 ? <VitalsSummary items={items} /> : null}

      {isLoading ? (
        <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
      ) : items.length === 0 ? (
        <EmptyState icon="pulse-outline" title="No readings yet" subtitle="Tap Log to add one." />
      ) : (
        sorted.map((v) => (
          <Card key={v.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[mono('500'), { fontSize: 12.5, color: color.foreground }]}>
                {fmtDateTime(v.recordedAt)}
              </Text>
              <Text style={[mono('400'), { fontSize: 13, color: color['muted-foreground'] }]}>
                {metricLine(v)}
              </Text>
              {v.notes ? (
                <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>{v.notes}</Text>
              ) : null}
            </View>
            <Pressable onPress={() => remove(v.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={color.destructive} />
            </Pressable>
          </Card>
        ))
      )}

      <ModalCard
        visible={open}
        onClose={() => setOpen(false)}
        title="Log a vital"
        presentation="sheet"
        footer={<Button label="Save" busy={add.isPending} onPress={save} />}
      >
        <View style={{ gap: 12 }}>
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FIELDS.map(({ key, label, decimal }) => (
              <View key={key} style={{ flexBasis: '47%', flexGrow: 1 }}>
                <Field
                  label={label}
                  keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
                  value={form[key]}
                  onChangeText={(v) =>
                    setForm((f) => ({ ...f, [key]: v.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '') }))
                  }
                />
              </View>
            ))}
          </View>
          <RowDatePicker
            label="Recorded on"
            value={recordedAt}
            onChange={setRecordedAt}
            maximumDate={new Date()}
          />
          <Field label="Notes" multiline value={notes} onChangeText={setNotes} />
        </View>
      </ModalCard>
    </Screen>
  );
}
