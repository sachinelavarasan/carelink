import type { CreatePrescriptionInput } from '@carelink/shared';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Field } from '@/components/Field';
import { FlagChips } from '@/components/FlagChips';
import { IntakePanel } from '@/components/IntakePanel';
import {
  MedicineRowsEditor,
  blankMedicine,
  fromMedicineItem,
  toMedicineItems,
  type MedicineDraft,
} from '@/components/MedicineRowsEditor';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { RowSelect } from '@/components/RowSelect';
import { SectionLabel } from '@/components/SectionLabel';
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

const DAY = 86_400_000;
const FOLLOWUP_OPTIONS = [
  { label: 'No follow-up', value: '' },
  ...[3, 5, 7, 10, 14, 21, 30, 45, 60, 90].map((n) => ({ label: `${n} days`, value: String(n) })),
];

export default function PrescriptionForm() {
  const { id: appointmentId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
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

  const followUpDays = followUpDate
    ? String(Math.max(0, Math.round((Date.parse(followUpDate) - Date.parse(isoDate(new Date()))) / DAY)))
    : '';
  const setFollowUpInDays = (v: string) =>
    setFollowUpDate(v ? isoDate(new Date(Date.now() + Number(v) * DAY)) : '');

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Prescription" />
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
              <Card style={{ paddingVertical: 0 }}>
                <RowSelect
                  label="Start from a template"
                  sheetTitle="Templates"
                  placeholder="Choose a template…"
                  options={templateOptions}
                  value=""
                  onChange={(v) => v && applyTemplate(v)}
                  showDivider={false}
                />
              </Card>
            ) : null}

            <SectionLabel first>Symptoms</SectionLabel>
            <Field value={symptoms} onChangeText={setSymptoms} placeholder="e.g. Cough x2w, wheeze at night" />

            <SectionLabel>Diagnosis</SectionLabel>
            <Field value={diagnosis} onChangeText={setDiagnosis} placeholder="Required" />

            <SectionLabel>{medCount ? `Medicines · ${medCount}` : 'Medicines'}</SectionLabel>
            <MedicineRowsEditor rows={items} onChange={setItems} favorites={favorites} />

            <SectionLabel>Advice</SectionLabel>
            <Field label="For the patient" multiline value={advice} onChangeText={setAdvice} />
            <Field
              label="Clinical notes (private)"
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <SectionLabel>Follow-up and flags</SectionLabel>
            <Card style={{ paddingVertical: 0 }}>
              <RowSelect
                label="Follow-up in"
                sheetTitle="Follow-up"
                placeholder="No follow-up"
                options={FOLLOWUP_OPTIONS}
                value={followUpDays}
                onChange={setFollowUpInDays}
                showDivider={false}
              />
            </Card>
            <FlagChips value={flags} onChange={setFlags} />

            <View style={{ gap: 8, marginTop: 6 }}>
              <Button label="Finalize & share" busy={busy} onPress={issue} />
              <Button label="Save draft" variant="ghost" busy={busy} onPress={saveDraft} />
            </View>
          </>
        )}
      </Screen>
    </>
  );
}
