import {
  DrugCategoryFlag,
  type CreatePrescriptionInput,
  type MedicineItem,
} from '@carelink/shared';
import { drugCategoryFlagMeta } from '@carelink/theme';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { DatePickerField } from '@/components/DatePickerField';
import { Field } from '@/components/Field';
import { IntakePanel } from '@/components/IntakePanel';
import {
  MedicineRowsEditor,
  blankMedicine,
  fromMedicineItem,
  medicineLabel,
  toMedicineItems,
  type MedicineDraft,
} from '@/components/MedicineRowsEditor';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import { useTemplates } from '@/hooks/usePrescriptionTemplates';
import {
  prescriptionKeys,
  useAppointmentPrescription,
  useCreatePrescription,
  useUpdatePrescription,
} from '@/hooks/usePrescriptions';
import { appointmentKeys } from '@/hooks/useAppointments';
import { api, errMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isoDate } from '@/lib/format';
import { useTheme } from '@/theme/ThemeProvider';

const FLAGS = Object.values(DrugCategoryFlag);

export default function PrescriptionForm() {
  const { id: appointmentId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const { color } = useTheme();
  const { me } = useAuth();
  const confirm = useConfirm();

  const rxQ = useAppointmentPrescription(appointmentId);
  const templates = useTemplates();
  const favorites = me?.doctorProfile?.favoriteMedicines ?? [];

  const existing = rxQ.data ?? null;
  const finalized = existing?.status === 'FINALIZED';

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<MedicineDraft[]>([blankMedicine()]);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed from the existing draft once.
  if (existing && !hydrated) {
    setSymptoms(existing.symptoms ?? '');
    setDiagnosis(existing.diagnosis);
    setAdvice(existing.advice ?? '');
    setNotes(existing.notes ?? '');
    setFollowUpDate(existing.followUpDate ?? '');
    setFlags(new Set(existing.drugCategoryFlags));
    setItems(existing.items.length ? existing.items.map(fromMedicineItem) : [blankMedicine()]);
    setHydrated(true);
  }

  const create = useCreatePrescription();
  const update = useUpdatePrescription(existing?.id ?? '', appointmentId);
  const busy = create.isPending || update.isPending;

  const templateOptions = useMemo(
    () => (templates.data ?? []).map((t) => ({ label: t.name, value: t.id })),
    [templates.data],
  );
  const favoriteOptions = useMemo(
    () => favorites.map((m, i) => ({ label: medicineLabel(m), value: String(i) })),
    [favorites],
  );

  function applyTemplate(templateId: string) {
    const t = templates.data?.find((x) => x.id === templateId);
    if (!t) return;
    setSymptoms(t.symptoms ?? '');
    setDiagnosis(t.diagnosis ?? '');
    setAdvice(t.advice ?? '');
    setFlags(new Set(t.drugCategoryFlags));
    setItems(t.items.length ? t.items.map(fromMedicineItem) : [blankMedicine()]);
    if (t.followUpDays != null) {
      setFollowUpDate(isoDate(new Date(Date.now() + t.followUpDays * 86_400_000)));
    }
  }

  function addFavorite(index: string) {
    const m: MedicineItem | undefined = favorites[Number(index)];
    if (!m) return;
    setItems((rs) => [...rs.filter((r) => r.drugName.trim() || r.frequency.trim()), fromMedicineItem(m)]);
  }

  function body(): Omit<CreatePrescriptionInput, 'appointmentId'> {
    return {
      symptoms: symptoms.trim() || undefined,
      diagnosis: diagnosis.trim(),
      advice: advice.trim() || undefined,
      notes: notes.trim() || undefined,
      followUpDate: followUpDate || undefined,
      drugCategoryFlags: [...flags] as CreatePrescriptionInput['drugCategoryFlags'],
      items: toMedicineItems(items),
    };
  }

  function validate(b: ReturnType<typeof body>): string | null {
    if (b.diagnosis.length < 2) return 'Enter a diagnosis.';
    if (b.items.length === 0) return 'Add at least one medicine with a frequency and duration.';
    return null;
  }

  async function persist(): Promise<string> {
    const b = body();
    const bad = validate(b);
    if (bad) throw new Error(bad);
    if (existing) {
      await update.mutateAsync(b);
      return existing.id;
    }
    const created = await create.mutateAsync({ appointmentId, ...b });
    return created.id;
  }

  async function saveDraft() {
    setError(null);
    try {
      await persist();
      showToast({ type: 'success', text1: 'Draft saved' });
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  async function issue() {
    setError(null);
    const bad = validate(body());
    if (bad) {
      setError(bad);
      return;
    }
    const ok = await confirm({
      title: 'Issue prescription?',
      message: 'This renders the PDF, sends it to the patient, and marks the consultation complete. It can’t be undone.',
      confirmLabel: 'Issue',
    });
    if (ok === false) return;
    try {
      const rxId = await persist();
      await api.post(`/prescriptions/${rxId}/finalize`, {});
      qc.invalidateQueries({ queryKey: prescriptionKeys.forAppointment(appointmentId) });
      qc.invalidateQueries({ queryKey: appointmentKeys.all });
      showToast({ type: 'success', text1: 'Prescription issued' });
      router.replace(`/prescription/${rxId}`);
    } catch (err) {
      setError(errMessage(err, 'Could not issue'));
    }
  }

  const medCount = toMedicineItems(items).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Prescription', headerBackTitle: 'Back' }} />
      <Screen contentStyle={{ gap: 14 }}>
        <IntakePanel appointmentId={appointmentId} />

        {finalized ? (
          <>
            <Notice tone="info">This prescription has been issued and can no longer be edited.</Notice>
            <Button
              label="View prescription"
              onPress={() => router.replace(`/prescription/${existing!.id}`)}
            />
          </>
        ) : (
          <>
            {existing ? (
              <Notice tone="warning">
                Draft — not visible to the patient until you issue it.
              </Notice>
            ) : null}
            {error ? <Notice tone="danger">{error}</Notice> : null}

            {templateOptions.length > 0 ? (
              <Select
                label="Start from a template"
                placeholder="Choose a template…"
                options={templateOptions}
                value=""
                onChange={(v) => v && applyTemplate(v)}
                search={templateOptions.length > 8}
              />
            ) : null}

            <Text style={sectionStyle(color)}>Assessment</Text>
            <Field label="Symptoms" multiline value={symptoms} onChangeText={setSymptoms} />
            <Field label="Diagnosis *" multiline value={diagnosis} onChangeText={setDiagnosis} />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={sectionStyle(color)}>Medicines{medCount ? ` · ${medCount}` : ''}</Text>
            </View>
            {favoriteOptions.length > 0 ? (
              <Select
                placeholder="Add from your regular medicines…"
                options={favoriteOptions}
                value=""
                onChange={(v) => v && addFavorite(v)}
              />
            ) : null}
            <MedicineRowsEditor rows={items} onChange={setItems} />

            <Text style={sectionStyle(color)}>Plan</Text>
            <Field label="Advice" multiline value={advice} onChangeText={setAdvice} />
            <Field
              label="Clinical notes (not shown to the patient)"
              multiline
              value={notes}
              onChangeText={setNotes}
            />
            <DatePickerField
              label="Follow-up date"
              value={followUpDate}
              onChange={setFollowUpDate}
              minimumDate={new Date()}
              placeholder="Optional"
            />

            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>
                Drug categories
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {FLAGS.map((f) => {
                  const on = flags.has(f);
                  return (
                    <Pressable
                      key={f}
                      onPress={() =>
                        setFlags((s) => {
                          const next = new Set(s);
                          if (next.has(f)) next.delete(f);
                          else next.add(f);
                          return next;
                        })
                      }
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderColor: on ? color.primary : color.border,
                        backgroundColor: on ? color.primary : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: on ? color['primary-foreground'] : color['muted-foreground'],
                        }}
                      >
                        {drugCategoryFlagMeta[f].label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Button
                label="Save draft"
                variant="outline"
                busy={busy}
                onPress={saveDraft}
                style={{ flex: 1 }}
              />
              <Button label="Issue" busy={busy} onPress={issue} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </Screen>
    </>
  );
}

const sectionStyle = (color: ReturnType<typeof useTheme>['color']) => ({
  fontSize: 12,
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  color: color['muted-foreground'],
  marginTop: 8,
});
