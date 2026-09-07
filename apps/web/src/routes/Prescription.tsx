import { DrugCategoryFlag, type PrescriptionView } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BackLink } from '../components/BackLink';
import { Notice } from '../components/Notice';
import { PrescriptionDetails } from '../components/PrescriptionDetails';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Field, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { api, apiGet, errMessage, isStatus } from '../lib/api';
import { useAuth } from '../lib/auth';

interface ItemRow {
  drugName: string;
  strength: string;
  form: string;
  frequency: string;
  durationDays: number;
  instructions: string;
}
const blankItem = (): ItemRow => ({
  drugName: '',
  strength: '',
  form: '',
  frequency: '',
  durationDays: 5,
  instructions: '',
});

const FLAGS = Object.values(DrugCategoryFlag);
const FLAG_LABEL: Record<string, string> = {
  OTC: 'OTC',
  SCHEDULE_H: 'Schedule H',
  SCHEDULE_H1: 'Schedule H1',
  SCHEDULE_X: 'Schedule X',
};

export default function Prescription() {
  const { appointmentId = '' } = useParams();
  const { me } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isDoctor = me?.user.role === 'DOCTOR';

  const rxQ = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => apiGet<PrescriptionView>(`/appointments/${appointmentId}/prescription`),
    retry: (n, e) => !isStatus(e, 404) && n < 2,
  });
  const existing = rxQ.data ?? null;
  const missing = rxQ.isError && isStatus(rxQ.error, 404);
  const editable = isDoctor && (!existing || existing.status === 'DRAFT');

  if (rxQ.isLoading) {
    return (
      <AppShell>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      </AppShell>
    );
  }
  if (rxQ.isError && !missing) {
    return (
      <AppShell>
        <BackLink to="/appointments">Appointments</BackLink>
        <Notice kind="error">{errMessage(rxQ.error, 'Could not load the prescription')}</Notice>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BackLink to="/appointments">Appointments</BackLink>
      <h1 className="mb-2 text-xl font-semibold">Prescription</h1>

      {editable ? (
        <PrescriptionForm
          appointmentId={appointmentId}
          existing={existing}
          onDone={() => {
            void qc.invalidateQueries({ queryKey: ['prescription', appointmentId] });
            void qc.invalidateQueries({ queryKey: ['appointments'] });
          }}
          onIssued={() => navigate('/appointments')}
        />
      ) : existing && existing.status === 'FINALIZED' ? (
        <PrescriptionDetails rx={existing} />
      ) : (
        <Notice kind="warning">
          {isDoctor
            ? 'No prescription yet.'
            : 'Your doctor has not issued a prescription for this consultation yet.'}
        </Notice>
      )}
    </AppShell>
  );
}

/* ----------------------------------------------------------------- doctor form */

function PrescriptionForm({
  appointmentId,
  existing,
  onDone,
  onIssued,
}: {
  appointmentId: string;
  existing: PrescriptionView | null;
  onDone: () => void;
  onIssued: () => void;
}) {
  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [advice, setAdvice] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<ItemRow[]>([blankItem()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setSymptoms(existing.symptoms ?? '');
    setDiagnosis(existing.diagnosis);
    setAdvice(existing.advice ?? '');
    setNotes(existing.notes ?? '');
    setFollowUpDate(existing.followUpDate ?? '');
    setFlags(new Set(existing.drugCategoryFlags));
    setItems(
      existing.items.length > 0
        ? existing.items.map((it) => ({
            drugName: it.drugName,
            strength: it.strength ?? '',
            form: it.form ?? '',
            frequency: it.frequency,
            durationDays: it.durationDays,
            instructions: it.instructions ?? '',
          }))
        : [blankItem()],
    );
  }, [existing]);

  const patchItem = (i: number, p: Partial<ItemRow>) =>
    setItems((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  function buildBody() {
    return {
      symptoms: symptoms.trim() || undefined,
      diagnosis: diagnosis.trim(),
      advice: advice.trim() || undefined,
      notes: notes.trim() || undefined,
      followUpDate: followUpDate || undefined,
      drugCategoryFlags: [...flags],
      items: items
        .filter((it) => it.drugName.trim() && it.frequency.trim())
        .map((it) => ({
          drugName: it.drugName.trim(),
          strength: it.strength.trim() || undefined,
          form: it.form.trim() || undefined,
          frequency: it.frequency.trim(),
          durationDays: Number(it.durationDays),
          instructions: it.instructions.trim() || undefined,
        })),
    };
  }

  /** Creates or updates the draft; returns its id. */
  async function persist(): Promise<string> {
    const body = buildBody();
    if (body.items.length === 0) throw new Error('Add at least one medicine with a frequency.');
    if (body.diagnosis.length < 2) throw new Error('Enter a diagnosis.');
    if (existing) {
      await api.patch(`/prescriptions/${existing.id}`, body);
      return existing.id;
    }
    const res = await api.post<PrescriptionView>('/prescriptions', { appointmentId, ...body });
    return res.data.id;
  }

  const saveM = useMutation({
    mutationFn: persist,
    onSuccess: () => {
      setError(null);
      onDone();
    },
    onError: (e) => setError(errMessage(e, 'Could not save')),
  });

  const issueM = useMutation({
    mutationFn: async () => {
      const id = await persist();
      await api.post(`/prescriptions/${id}/finalize`, {});
    },
    onSuccess: () => {
      setError(null);
      onDone();
      onIssued();
    },
    onError: (e) => setError(errMessage(e, 'Could not issue')),
  });

  const busy = saveM.isPending || issueM.isPending;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    saveM.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {existing && (
        <Notice kind="warning">
          Draft — not visible to the patient until you issue it. Issuing renders the PDF and marks
          the consultation complete.
        </Notice>
      )}
      {error && <Notice kind="error">{error}</Notice>}

      <Field>
        <FieldLabel>Symptoms</FieldLabel>
        <Textarea rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Diagnosis *</FieldLabel>
        <Textarea
          rows={2}
          required
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
        />
      </Field>

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Medicines *</h2>
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-40 flex-1"
                placeholder="Drug name"
                value={it.drugName}
                onChange={(e) => patchItem(i, { drugName: e.target.value })}
              />
              <Input
                className="w-28"
                placeholder="Strength"
                value={it.strength}
                onChange={(e) => patchItem(i, { strength: e.target.value })}
              />
              <Input
                className="w-28"
                placeholder="Form"
                value={it.form}
                onChange={(e) => patchItem(i, { form: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                className="min-w-40 flex-1"
                placeholder="Frequency (e.g. 1 tab twice daily)"
                value={it.frequency}
                onChange={(e) => patchItem(i, { frequency: e.target.value })}
              />
              <Input
                type="number"
                className="w-24"
                min={1}
                max={365}
                value={it.durationDays}
                onChange={(e) => patchItem(i, { durationDays: Number(e.target.value) })}
              />
              <span className="self-center text-sm text-muted-foreground">days</span>
            </div>
            <Input
              placeholder="Instructions (e.g. after food)"
              value={it.instructions}
              onChange={(e) => patchItem(i, { instructions: e.target.value })}
            />
            {items.length > 1 && (
              <button
                type="button"
                className="justify-self-start text-sm text-destructive hover:underline"
                onClick={() => setItems((rs) => rs.filter((_, idx) => idx !== i))}
              >
                Remove
              </button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => setItems((rs) => [...rs, blankItem()])}
        >
          Add medicine
        </Button>
      </div>

      <Field>
        <FieldLabel>Advice</FieldLabel>
        <Textarea rows={2} value={advice} onChange={(e) => setAdvice(e.target.value)} />
      </Field>
      <Field>
        <FieldLabel>Clinical notes (not shown to the patient)</FieldLabel>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex flex-wrap items-end gap-4">
        <Field className="w-44">
          <FieldLabel>Follow-up date</FieldLabel>
          <Input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
          />
        </Field>
        <div className="grid gap-1">
          <span className="text-sm font-medium">Drug categories</span>
          <div className="flex flex-wrap gap-3">
            {FLAGS.map((f) => (
              <label key={f} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={flags.has(f)}
                  onCheckedChange={(v) =>
                    setFlags((s) => {
                      const next = new Set(s);
                      if (v === true) next.add(f);
                      else next.delete(f);
                      return next;
                    })
                  }
                />
                {FLAG_LABEL[f] ?? f}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="outline" disabled={busy}>
          {saveM.isPending ? 'Saving…' : 'Save draft'}
        </Button>
        <Button type="button" disabled={busy} onClick={() => issueM.mutate()}>
          {issueM.isPending ? 'Issuing…' : 'Issue prescription'}
        </Button>
      </div>
    </form>
  );
}
