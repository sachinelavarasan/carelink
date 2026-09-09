import type { MedicineItem } from '@carelink/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Field } from '@/components/Field';
import { ModalCard } from '@/components/ModalCard';
import { mono } from '@/lib/fonts';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

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
  favorites = [],
}: {
  rows: MedicineDraft[];
  onChange: (rows: MedicineDraft[]) => void;
  /** The doctor's saved medicines — offered as a pick-list on each drug-name field. */
  favorites?: MedicineItem[];
}) {
  const { color } = useTheme();
  const [pickFor, setPickFor] = useState<number | null>(null);

  const patch = (i: number, key: keyof MedicineDraft, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  const remove = (i: number) => onChange(rows.filter((_, idx) => idx !== i));

  const applyFavorite = (m: MedicineItem) => {
    if (pickFor === null) return;
    const picked = fromMedicineItem(m);
    onChange(
      rows.map((r, idx) =>
        idx === pickFor ? { ...picked, durationDays: r.durationDays || picked.durationDays } : r,
      ),
    );
    setPickFor(null);
  };

  return (
    <View style={{ gap: space.md }}>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{
            gap: space.sm,
            borderWidth: 1,
            borderColor: color.border,
            borderRadius: radius.lg,
            backgroundColor: color.card,
            padding: space.lg,
          }}
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: color['muted-foreground'],
              }}
            >
              Medicine {i + 1}
            </Text>
            {rows.length > 1 ? (
              <Pressable onPress={() => remove(i)} hitSlop={8}>
                <Ionicons name="trash-outline" size={16} color={color.destructive} />
              </Pressable>
            ) : null}
          </View>

          {/* drug name — type freely, or pick from the doctor's saved list */}
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Field
                placeholder="Drug name *"
                value={r.drugName}
                onChangeText={(v) => patch(i, 'drugName', v)}
              />
            </View>
            {favorites.length > 0 ? (
              <Pressable
                onPress={() => setPickFor(i)}
                accessibilityRole="button"
                accessibilityLabel="Pick from saved medicines"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.sm,
                  borderWidth: 1,
                  borderColor: color.border,
                  backgroundColor: color.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="list-outline" size={18} color={color.primary} />
              </Pressable>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: space.sm }}>
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
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 2 }}>
              <Field
                placeholder="Frequency * (1-0-1)"
                value={r.frequency}
                onChangeText={(v) => patch(i, 'frequency', v)}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                placeholder="Days *"
                keyboardType="number-pad"
                value={r.durationDays}
                onChangeText={(v) => patch(i, 'durationDays', v.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>
          <Field
            placeholder="Instructions (after food, SOS…)"
            value={r.instructions}
            onChangeText={(v) => patch(i, 'instructions', v)}
          />
        </View>
      ))}

      <Pressable
        onPress={() => onChange([...rows, blankMedicine()])}
        hitSlop={6}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
      >
        <Ionicons name="add" size={18} color={color.primary} />
        <Text style={{ fontSize: 14, fontWeight: '600', color: color.primary }}>Add medicine</Text>
      </Pressable>

      <ModalCard
        visible={pickFor !== null}
        onClose={() => setPickFor(null)}
        presentation="sheet"
        title="Your saved medicines"
      >
        <View>
          {favorites.map((m, k) => (
            <Pressable
              key={`${m.drugName}-${k}`}
              onPress={() => applyFavorite(m)}
              style={{
                paddingVertical: 13,
                borderBottomWidth: k < favorites.length - 1 ? 1 : 0,
                borderBottomColor: color.border,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: color.foreground }}>
                {m.drugName}
              </Text>
              <Text style={[mono('400'), { fontSize: 12, color: color['muted-foreground'] }]}>
                {[m.strength, m.form, m.frequency].filter(Boolean).join(' · ') || 'no details saved'}
              </Text>
            </Pressable>
          ))}
        </View>
      </ModalCard>
    </View>
  );
}
