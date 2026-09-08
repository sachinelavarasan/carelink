import type { VitalEntryInput, VitalsList } from '@carelink/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { VitalsPanel } from '../components/VitalsPanel';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { api, apiGet, errMessage } from '../lib/api';
import { isoDate } from '../lib/format';

interface FormState {
  recordedOn: string;
  weightKg: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  bloodSugarMgDl: string;
  temperatureC: string;
  notes: string;
}
const emptyForm = (): FormState => ({
  recordedOn: isoDate(new Date()),
  weightKg: '',
  systolic: '',
  diastolic: '',
  heartRate: '',
  bloodSugarMgDl: '',
  temperatureC: '',
  notes: '',
});
const numOrUndef = (s: string) => (s.trim() === '' ? undefined : Number(s));

export default function Vitals() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['vitals'], queryFn: () => apiGet<VitalsList>('/me/vitals') });
  const items = q.data?.items ?? [];

  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const add = useMutation({
    mutationFn: (body: VitalEntryInput) => api.post('/me/vitals', body),
    onSuccess: async () => {
      setError(null);
      setForm(emptyForm());
      await qc.invalidateQueries({ queryKey: ['vitals'] });
    },
    onError: (e) => setError(errMessage(e, 'Could not save the reading')),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/me/vitals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vitals'] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body: VitalEntryInput = {
      recordedAt: form.recordedOn ? new Date(`${form.recordedOn}T12:00:00`).toISOString() : undefined,
      weightKg: numOrUndef(form.weightKg),
      systolic: numOrUndef(form.systolic),
      diastolic: numOrUndef(form.diastolic),
      heartRate: numOrUndef(form.heartRate),
      bloodSugarMgDl: numOrUndef(form.bloodSugarMgDl),
      temperatureC: numOrUndef(form.temperatureC),
      notes: form.notes.trim() || undefined,
    };
    const hasMeasurement = [
      body.weightKg,
      body.systolic,
      body.diastolic,
      body.heartRate,
      body.bloodSugarMgDl,
      body.temperatureC,
    ].some((n) => n != null);
    if (!hasMeasurement) {
      setError('Enter at least one measurement.');
      return;
    }
    add.mutate(body);
  }

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Vitals</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log readings over time — weight, blood pressure, heart rate and more. Your doctors can see
        these during a consultation.
      </p>

      <Card className="mt-4">
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            {error && <Notice kind="error">{error}</Notice>}
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field>
                  <FieldLabel>Date</FieldLabel>
                  <Input
                    type="date"
                    max={isoDate(new Date())}
                    value={form.recordedOn}
                    onChange={(e) => set('recordedOn')(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Weight (kg)</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form.weightKg}
                    onChange={(e) => set('weightKg')(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Heart rate (bpm)</FieldLabel>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={form.heartRate}
                    onChange={(e) => set('heartRate')(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Blood pressure (systolic / diastolic)</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label="Systolic"
                      className="w-20"
                      value={form.systolic}
                      onChange={(e) => set('systolic')(e.target.value)}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      aria-label="Diastolic"
                      className="w-20"
                      value={form.diastolic}
                      onChange={(e) => set('diastolic')(e.target.value)}
                    />
                  </div>
                </Field>
                <Field>
                  <FieldLabel>Blood sugar (mg/dL)</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form.bloodSugarMgDl}
                    onChange={(e) => set('bloodSugarMgDl')(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Temperature (°C)</FieldLabel>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={form.temperatureC}
                    onChange={(e) => set('temperatureC')(e.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Notes</FieldLabel>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => set('notes')(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button type="submit" size="sm" className="w-fit" disabled={add.isPending}>
              {add.isPending ? 'Saving…' : 'Add reading'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6">
        {q.isLoading ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </p>
        ) : q.isError ? (
          <Notice kind="error">Could not load your vitals.</Notice>
        ) : (
          <VitalsPanel items={items} onDelete={(id) => remove.mutate(id)} />
        )}
      </div>
    </AppShell>
  );
}
