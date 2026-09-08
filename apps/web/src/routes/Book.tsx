import type { Appointment, DoctorPublic, Slot } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { type FormEvent, useId, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '../components/ui/field';
import { Textarea } from '../components/ui/textarea';
import { api, apiGet, errMessage } from '../lib/api';
import { fmtDayHeading, fmtTime, isoDate } from '../lib/format';
import { cn } from '@/lib/utils';

function groupByDay(slots: Slot[]): [string, Slot[]][] {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = s.start.slice(0, 10);
    const arr = map.get(key);
    if (arr) arr.push(s);
    else map.set(key, [s]);
  }
  return [...map.entries()];
}

export default function Book() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rescheduleId = params.get('reschedule');
  const doctorIdParam = params.get('doctorId');
  // Optional follow-up target (YYYY-MM-DD) from a prescription — shifts the slot
  // window so that date is in view.
  const focusDateParam = params.get('date');
  const reasonId = useId();

  // Rescheduling keeps the original doctor — look it up from the appointment.
  const apptQ = useQuery({
    queryKey: ['appointment', rescheduleId],
    enabled: Boolean(rescheduleId),
    queryFn: () => apiGet<Appointment>(`/appointments/${rescheduleId}`),
  });
  const doctorId = rescheduleId ? apptQ.data?.doctorId : doctorIdParam;

  const doctorQ = useQuery({
    queryKey: ['doctor', doctorId],
    enabled: Boolean(doctorId),
    queryFn: () => apiGet<DoctorPublic>(`/doctors/${doctorId}`),
  });
  const doctor = doctorQ.data;

  const from = isoDate(new Date());
  // Default: the next two weeks. With a follow-up date, widen the window to a week
  // past it so that day is in view (clamped to today … +59d, the slots endpoint's
  // max range).
  const focusDate = focusDateParam && focusDateParam >= from ? focusDateParam : null;
  const to = focusDate
    ? isoDate(
        new Date(
          Math.min(
            Date.parse(`${focusDate}T00:00:00Z`) + 7 * 86_400_000,
            Date.parse(`${from}T00:00:00Z`) + 59 * 86_400_000,
          ),
        ),
      )
    : isoDate(new Date(Date.now() + 13 * 86_400_000));

  const slotsQ = useQuery({
    queryKey: ['slots', doctor?.id, from, to],
    enabled: Boolean(doctor),
    queryFn: () => apiGet<Slot[]>(`/doctors/${doctor!.id}/slots`, { from, to }),
  });

  const days = useMemo(() => groupByDay(slotsQ.data ?? []), [slotsQ.data]);

  const [picked, setPicked] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // No doctor context and nothing to reschedule → send them to discovery.
  if (!rescheduleId && !doctorIdParam) return <Navigate to="/doctors" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!picked || !doctor) return;
    setError(null);
    setBusy(true);
    try {
      if (rescheduleId) {
        await api.post(`/appointments/${rescheduleId}/reschedule`, { scheduledStart: picked.start });
      } else {
        await api.post('/appointments', {
          doctorId: doctor.id,
          scheduledStart: picked.start,
          reasonForVisit: reason,
          consentAccepted: true,
        });
      }
      navigate('/appointments');
    } catch (err) {
      setError(errMessage(err, 'Could not book that slot'));
      setBusy(false);
    }
  }

  const loading = apptQ.isLoading || doctorQ.isLoading;

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">
        {rescheduleId ? 'Reschedule appointment' : 'Book a consultation'}
      </h1>

      {loading && (
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}
      {(apptQ.isError || doctorQ.isError) && (
        <div className="mt-4">
          <Notice kind="error">
            {errMessage(apptQ.error ?? doctorQ.error, 'Could not load this doctor.')}
          </Notice>
        </div>
      )}

      {doctor && (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {doctor.fullName} · {doctor.specializations.join(', ')} · ₹{doctor.consultationFeeInr}
          </p>

          {focusDate && (
            <p className="mt-4 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Your prescription suggested a follow-up around{' '}
              <span className="font-medium text-foreground">{fmtDayHeading(focusDate)}</span>. Pick
              whichever slot works.
            </p>
          )}

          {error && (
            <div className="mt-4">
              <Notice kind="error">{error}</Notice>
            </div>
          )}

          {slotsQ.isLoading && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading slots…
            </p>
          )}
          {slotsQ.data && days.length === 0 && (
            <div className="mt-4">
              <Notice kind="warning">No open slots in the next two weeks.</Notice>
            </div>
          )}

          <div className="mt-4 grid gap-4">
            {days.map(([day, slots]) => (
              <div
                key={day}
                className={
                  day === focusDate ? 'rounded-lg bg-muted/60 p-2 ring-1 ring-border' : undefined
                }
              >
                <h3 className="mb-1.5 text-sm font-medium">
                  {fmtDayHeading(slots[0].start)}
                  {day === focusDate && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      · suggested follow-up
                    </span>
                  )}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {slots.map((s) => (
                    <Button
                      key={s.start}
                      type="button"
                      size="sm"
                      variant={picked?.start === s.start ? 'default' : 'outline'}
                      onClick={() => setPicked(s)}
                    >
                      {fmtTime(s.start)}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {picked && (
            <form onSubmit={submit} className="mt-6">
              <FieldGroup>
                {!rescheduleId && (
                  <>
                    <Field>
                      <FieldLabel htmlFor={reasonId}>Reason for visit</FieldLabel>
                      <Textarea
                        id={reasonId}
                        required
                        minLength={3}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </Field>
                    <label className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={consent}
                        onCheckedChange={(v) => setConsent(v === true)}
                        className="mt-0.5"
                      />
                      <span>
                        I consent to a teleconsultation and confirm the information I provide is
                        accurate.
                      </span>
                    </label>
                  </>
                )}
                <Button
                  type="submit"
                  className={cn('w-fit', !rescheduleId && !consent && 'pointer-events-none opacity-50')}
                  disabled={busy || (!rescheduleId && !consent)}
                >
                  {busy ? 'Booking…' : `Confirm ${fmtTime(picked.start)}`}
                </Button>
              </FieldGroup>
            </form>
          )}
        </>
      )}
    </AppShell>
  );
}
