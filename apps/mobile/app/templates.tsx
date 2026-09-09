import type { PrescriptionTemplate, PrescriptionTemplateInput } from '@carelink/shared';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Field } from '@/components/Field';
import { FlagChips } from '@/components/FlagChips';
import {
  MedicineRowsEditor,
  blankMedicine,
  fromMedicineItem,
  toMedicineItems,
  type MedicineDraft,
} from '@/components/MedicineRowsEditor';
import { ModalCard } from '@/components/ModalCard';
import { Notice } from '@/components/Notice';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { showToast } from '@/components/ToastMessage';
import { useConfirm } from '@/hooks/useConfirm';
import {
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
  useUpdateTemplate,
} from '@/hooks/usePrescriptionTemplates';
import { errMessage } from '@/lib/api';
import { useTheme } from '@/theme/ThemeProvider';

type Draft = {
  name: string;
  symptoms: string;
  diagnosis: string;
  advice: string;
  followUpDays: string;
  flags: Set<string>;
  items: MedicineDraft[];
};

const emptyDraft = (): Draft => ({
  name: '',
  symptoms: '',
  diagnosis: '',
  advice: '',
  followUpDays: '',
  flags: new Set(),
  items: [blankMedicine()],
});

const toDraft = (t: PrescriptionTemplate): Draft => ({
  name: t.name,
  symptoms: t.symptoms ?? '',
  diagnosis: t.diagnosis ?? '',
  advice: t.advice ?? '',
  followUpDays: t.followUpDays != null ? String(t.followUpDays) : '',
  flags: new Set(t.drugCategoryFlags),
  items: t.items.length ? t.items.map(fromMedicineItem) : [blankMedicine()],
});

export default function Templates() {
  const { color } = useTheme();
  const confirm = useConfirm();
  const { data: templates = [], isLoading } = useTemplates();
  const create = useCreateTemplate();
  const del = useDeleteTemplate();

  const [editing, setEditing] = useState<PrescriptionTemplate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateTemplate(editing?.id ?? '');
  const busy = create.isPending || update.isPending;

  function openNew() {
    setEditing(null);
    setDraft(emptyDraft());
    setError(null);
  }
  function openEdit(t: PrescriptionTemplate) {
    setEditing(t);
    setDraft(toDraft(t));
    setError(null);
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError('Give the template a name.');
      return;
    }
    const input: PrescriptionTemplateInput = {
      name: draft.name.trim(),
      symptoms: draft.symptoms.trim() || undefined,
      diagnosis: draft.diagnosis.trim() || undefined,
      advice: draft.advice.trim() || undefined,
      followUpDays: draft.followUpDays ? Number(draft.followUpDays) : undefined,
      drugCategoryFlags: [...draft.flags] as PrescriptionTemplateInput['drugCategoryFlags'],
      items: toMedicineItems(draft.items),
    };
    try {
      if (editing) await update.mutateAsync(input);
      else await create.mutateAsync(input);
      showToast({ type: 'success', text1: editing ? 'Template updated' : 'Template created' });
      setDraft(null);
    } catch (err) {
      setError(errMessage(err, 'Could not save'));
    }
  }

  async function remove(t: PrescriptionTemplate) {
    if ((await confirm({ title: `Delete "${t.name}"?`, destructive: true, confirmLabel: 'Delete' })) === false) {
      return;
    }
    try {
      await del.mutateAsync(t.id);
    } catch (err) {
      showToast({ type: 'error', text1: errMessage(err, 'Could not delete') });
    }
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Templates" />
      <Screen contentStyle={{ gap: 12 }}>
        <Button label="New template" onPress={openNew} />

        {isLoading ? (
          <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>Loading…</Text>
        ) : templates.length === 0 ? (
          <EmptyState
            icon="documents-outline"
            title="No templates"
            subtitle="Save a common prescription skeleton to reuse it in one tap."
          />
        ) : (
          templates.map((t) => (
            <Card key={t.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: color.foreground, flex: 1 }}>
                  {t.name}
                </Text>
                <Pressable onPress={() => openEdit(t)} hitSlop={8}>
                  <Ionicons name="pencil" size={16} color={color['muted-foreground']} />
                </Pressable>
                <Pressable onPress={() => remove(t)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={color.destructive} />
                </Pressable>
              </View>
              {t.diagnosis ? (
                <Text style={{ fontSize: 13, color: color['muted-foreground'] }}>{t.diagnosis}</Text>
              ) : null}
              <Text style={{ fontSize: 12, color: color['muted-foreground'] }}>
                {t.items.length} medicine{t.items.length === 1 ? '' : 's'}
              </Text>
            </Card>
          ))
        )}
      </Screen>

      <ModalCard
        visible={draft !== null}
        onClose={() => setDraft(null)}
        title={editing ? 'Edit template' : 'New template'}
        presentation="sheet"
        footer={<Button label="Save" busy={busy} onPress={save} />}
      >
        {draft ? (
          <View style={{ gap: 12 }}>
            {error ? <Notice tone="danger">{error}</Notice> : null}
            <Field label="Name *" value={draft.name} onChangeText={(v) => set('name', v)} />
            <Field label="Symptoms" multiline value={draft.symptoms} onChangeText={(v) => set('symptoms', v)} />
            <Field label="Diagnosis" multiline value={draft.diagnosis} onChangeText={(v) => set('diagnosis', v)} />
            <Field label="Advice" multiline value={draft.advice} onChangeText={(v) => set('advice', v)} />
            <Field
              label="Follow-up in N days"
              keyboardType="number-pad"
              value={draft.followUpDays}
              onChangeText={(v) => set('followUpDays', v.replace(/[^0-9]/g, ''))}
            />
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>
                Drug categories
              </Text>
              <FlagChips value={draft.flags} onChange={(next) => set('flags', next)} />
            </View>
            <Text style={{ fontSize: 13, fontWeight: '500', color: color.foreground }}>Medicines</Text>
            <MedicineRowsEditor rows={draft.items} onChange={(rows) => set('items', rows)} />
          </View>
        ) : null}
      </ModalCard>
    </>
  );
}
