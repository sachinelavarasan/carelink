import type { AppointmentIntakeView, IntakeSeverity } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardListIcon } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { api, apiGet, errMessage, isStatus } from '../lib/api';
import { Notice } from './Notice';
import { Spinner } from './Spinner';
import { Button } from './ui/button';
import { Field, FieldGroup, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from './ui/sheet';
import { Textarea } from './ui/textarea';

const SEVERITY_LABEL: Record<IntakeSeverity, string> = {
  MILD: 'Mild',
  MODERATE: 'Moderate',
  SEVERE: 'Severe',
};
/** Sentinel for the "not sure" option — base-ui Select can't hold an empty value. */
const NONE = '__none__';

const intakeKey = (appointmentId: string) => ['intake', appointmentId];

function useIntake(appointmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: intakeKey(appointmentId),
    queryFn: () => apiGet<AppointmentIntakeView | null>(`/appointments/${appointmentId}/intake`),
    retry: (n, e) => !isStatus(e, 404) && n < 2,
    enabled,
  });
}

interface FormState {
  chiefComplaint: string;
  symptomsStarted: string;
  severity: string;
  currentMedications: string;
  allergies: string;
  additionalNotes: string;
}
const emptyForm: FormState = {
  chiefComplaint: '',
  symptomsStarted: '',
  severity: NONE,
  currentMedications: '',
  allergies: '',
  additionalNotes: '',
};
function fromView(v: AppointmentIntakeView | null): FormState {
  return {
    chiefComplaint: v?.chiefComplaint ?? '',
    symptomsStarted: v?.symptomsStarted ?? '',
    severity: v?.severity ?? NONE,
    currentMedications: v?.currentMedications ?? '',
    allergies: v?.allergies ?? '',
    additionalNotes: v?.additionalNotes ?? '',
  };
}

/** Read-only render of the patient's pre-visit answers. */
export function IntakeView({ intake }: { intake: AppointmentIntakeView }) {
  const rows: [string, string | undefined][] = [
    ['Main concern', intake.chiefComplaint],
    ['Started', intake.symptomsStarted],
    ['Severity', intake.severity ? SEVERITY_LABEL[intake.severity] : undefined],
    ['Current medications', intake.currentMedications],
    ['Allergies', intake.allergies],
    ['Anything else', intake.additionalNotes],
  ];
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(([label, value]) =>
        value ? (
          <div key={label} className="grid gap-0.5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="whitespace-pre-wrap">{value}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}

/** Inline panel for the doctor's prescription page — the patient's pre-visit
 *  notes, or nothing if they didn't fill any. */
export function IntakePanel({ appointmentId }: { appointmentId: string }) {
  const q = useIntake(appointmentId, true);
  if (q.isLoading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading pre-visit notes…
      </p>
    );
  }
  if (!q.data) return null;
  return (
    <section className="rounded-lg border border-border bg-muted/40 p-4">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <ClipboardListIcon className="size-4" aria-hidden />
        Patient's pre-visit notes
      </h2>
      <IntakeView intake={q.data} />
    </section>
  );
}

/** Link + sheet for the patient to add / edit their pre-visit questionnaire. */
export function PreVisitSheet({
  appointmentId,
  label = 'Pre-visit details',
}: {
  appointmentId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const q = useIntake(appointmentId, open);
  const existing = q.data ?? null;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setForm(fromView(existing));
  }, [open, existing]);

  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: () =>
      api.put(`/appointments/${appointmentId}/intake`, {
        chiefComplaint: form.chiefComplaint.trim(),
        symptomsStarted: form.symptomsStarted.trim() || undefined,
        severity: form.severity === NONE ? undefined : form.severity,
        currentMedications: form.currentMedications.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        additionalNotes: form.additionalNotes.trim() || undefined,
      }),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: intakeKey(appointmentId) });
      setOpen(false);
    },
    onError: (e) => setError(errMessage(e, 'Could not save')),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.chiefComplaint.trim().length < 3) {
      setError('Describe the main concern (at least a few words).');
      return;
    }
    save.mutate();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button type="button" className="text-primary underline underline-offset-4">
            {existing ? 'Edit pre-visit details' : label}
          </button>
        }
      />
      <SheetContent title="Pre-visit details">
        {q.isLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </p>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-4 pb-2">
            <p className="text-sm text-muted-foreground">
              A few details before your consultation. Only your doctor sees these.
            </p>
            {error && <Notice kind="error">{error}</Notice>}
            <FieldGroup>
              <Field>
                <FieldLabel>Main concern *</FieldLabel>
                <Textarea
                  required
                  rows={3}
                  value={form.chiefComplaint}
                  onChange={(e) => set('chiefComplaint')(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>When did it start?</FieldLabel>
                <Input
                  placeholder="e.g. 3 days ago"
                  value={form.symptomsStarted}
                  onChange={(e) => set('symptomsStarted')(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>How severe is it?</FieldLabel>
                <Select value={form.severity} onValueChange={(v) => v && set('severity')(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Not sure</SelectItem>
                    <SelectItem value="MILD">Mild</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="SEVERE">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Medicines you're currently taking</FieldLabel>
                <Textarea
                  rows={2}
                  value={form.currentMedications}
                  onChange={(e) => set('currentMedications')(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel>Known allergies</FieldLabel>
                <Input value={form.allergies} onChange={(e) => set('allergies')(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>Anything else the doctor should know</FieldLabel>
                <Textarea
                  rows={2}
                  value={form.additionalNotes}
                  onChange={(e) => set('additionalNotes')(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <SheetClose
                render={
                  <Button type="button" variant="outline" size="sm">
                    Cancel
                  </Button>
                }
              />
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
