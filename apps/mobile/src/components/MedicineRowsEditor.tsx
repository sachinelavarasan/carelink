import type { MedicineItem } from '@carelink/shared';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Field } from '@/components/Field';
import { useTheme } from '@/theme/ThemeProvider';

export interface MedicineDraft {
  drugName: string;
  strength: string;
  form: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}

export const blankMedicine = (): MedicineDraft => ({
  drugName: '',
  strength: '',
  form: '',
  frequency: '',
  durationDays: '',
  instructions: '',
});

export const fromMedicineItem = (m: MedicineItem): MedicineDraft => ({
  drugName: m.drugName,
  strength: m.strength ?? '',
  form: m.form ?? '',
  frequency: m.frequency,
  durationDays: String(m.durationDays ?? ''),
  instructions: m.instructions ?? '',
});

/** Keep only rows with a name + frequency + a valid duration. */
export function toMedicineItems(rows: MedicineDraft[]): MedicineItem[] {
  return rows
    .filter((r) => r.drugName.trim() && r.frequency.trim() && Number(r.durationDays) >= 1)
    .map((r) => ({
      drugName: r.drugName.trim(),
      strength: r.strength.trim() || undefined,
      form: r.form.trim() || undefined,
      frequency: r.frequency.trim(),
      durationDays: Math.min(365, Math.max(1, Math.round(Number(r.durationDays)))),
      instructions: r.instructions.trim() || undefined,
    }));
}

export const medicineLabel = (m: MedicineItem) =>
  [m.drugName, m.strength, m.form && `(${m.form})`].filter(Boolean).join(' ');

export function MedicineRowsEditor({
  rows,
  onChange,
}: {
  rows: MedicineDraft[];
  onChange: (rows: MedicineDraft[]) => void;
}) {
  const { color } = useTheme();

  const patch = (i: number, key: keyof MedicineDraft, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  return (
    <View style={{ gap: 14 }}>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{
            gap: 8,
            borderWidth: 1,
            borderColor: color.border,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: color['muted-foreground'] }}>
              Medicine {i + 1}
            </Text>
            {rows.length > 1 ? (
              <Pressable onPress={() => remove(i)} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: color.destructive }}>Remove</Text>
              </Pressable>
            ) : null}
          </View>

          <Field
            placeholder="Drug name *"
            value={r.drugName}
            onChangeText={(v) => patch(i, 'drugName', v)}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Field
                placeholder="Strength"
                value={r.strength}
                onChangeText={(v) => patch(i, 'strength', v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field placeholder="Form" value={r.form} onChangeText={(v) => patch(i, 'form', v)} />
            </View>
          </View>
          <Field
            placeholder="Frequency * (e.g. 1-0-1 after food)"
            value={r.frequency}
            onChangeText={(v) => patch(i, 'frequency', v)}
          />
          <Field
            placeholder="Duration in days *"
            keyboardType="number-pad"
            value={r.durationDays}
            onChangeText={(v) => patch(i, 'durationDays', v.replace(/[^0-9]/g, ''))}
          />
          <Field
            placeholder="Instructions"
            multiline
            value={r.instructions}
            onChangeText={(v) => patch(i, 'instructions', v)}
          />
        </View>
      ))}

      <Button
        label="Add medicine"
        variant="outline"
        size="sm"
        onPress={() => onChange([...rows, blankMedicine()])}
      />
    </View>
  );
}
