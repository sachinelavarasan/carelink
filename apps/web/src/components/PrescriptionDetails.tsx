import type { PrescriptionView } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { FileTextIcon } from 'lucide-react';
import { useState } from 'react';
import { Notice } from './Notice';
import { Spinner } from './Spinner';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { cn } from '@/lib/utils';
import { apiGet, errMessage, isStatus, openPdf } from '../lib/api';
import { fmtDateTime } from '../lib/format';

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (children == null || children === '') return null;
  return (
    <div className={cn('grid content-start gap-1', className)}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/** Read-only render of a finalised (or draft, for the doctor) prescription —
 *  the full consultation record. Used on the prescription page and inline in
 *  the appointment / medical-history expanders. */
export function PrescriptionDetails({ rx }: { rx: PrescriptionView }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p className="font-medium">{rx.doctorName}</p>
        {rx.doctorQualifications && (
          <p className="text-muted-foreground">{rx.doctorQualifications}</p>
        )}
        <p className="text-muted-foreground">
          {rx.medicalCouncil} · Reg. No. {rx.registrationNumber}
        </p>
        <p className="mt-2 text-muted-foreground">
          For {rx.patientName} · consultation {fmtDateTime(rx.scheduledStart)}
        </p>
        {rx.finalizedAt && (
          <p className="text-muted-foreground">Issued {fmtDateTime(rx.finalizedAt)}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Section title="Symptoms">{rx.symptoms}</Section>
        <Section title="Diagnosis">{rx.diagnosis}</Section>

        <Section title="Rx" className="sm:col-span-2 lg:col-span-3">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {rx.items.map((it) => (
              <li key={it.id} className="rounded-md border border-border p-2">
                <span className="font-medium">
                  {[it.drugName, it.strength, it.form].filter(Boolean).join(' ')}
                </span>
                <span className="block text-muted-foreground">
                  {it.frequency} · {it.durationDays} day{it.durationDays === 1 ? '' : 's'}
                  {it.instructions ? ` · ${it.instructions}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Advice">{rx.advice}</Section>
        {rx.notes != null && <Section title="Notes">{rx.notes}</Section>}
        <Section title="Follow-up">{rx.followUpDate}</Section>
        <Section title="Drug categories">{rx.drugCategoryFlags.join(', ') || null}</Section>
      </div>

      {rx.pdfReady && (
        <div>
          <PdfButton prescriptionId={rx.id} />
        </div>
      )}
    </div>
  );
}

/** Opens the prescription PDF in a new tab (fetched with auth, served as a blob). */
export function PdfButton({
  prescriptionId,
  size,
  variant,
  label = 'Download PDF',
}: {
  prescriptionId: string;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      await openPdf(`/prescriptions/${prescriptionId}/pdf`);
    } catch (e) {
      setError(errMessage(e, 'Could not open the PDF'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-1">
      <Button type="button" size={size} variant={variant} disabled={busy} onClick={open}>
        {busy ? 'Opening…' : label}
      </Button>
      {error && <span className="text-sm text-danger-fg">{error}</span>}
    </div>
  );
}

/** Lazily loads and renders the prescription for one past appointment. Only
 *  fetches when `active` (i.e. the sheet is open). */
function ConsultationRecord({
  appointmentId,
  active,
}: {
  appointmentId: string;
  active: boolean;
}) {
  const rxQ = useQuery({
    queryKey: ['prescription', appointmentId],
    queryFn: () => apiGet<PrescriptionView>(`/appointments/${appointmentId}/prescription`),
    retry: (n, e) => !isStatus(e, 404) && n < 2,
    enabled: active,
  });

  if (rxQ.isLoading || rxQ.isPending) {
    return (
      <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading…
      </p>
    );
  }
  if (rxQ.isError) {
    return isStatus(rxQ.error, 404) ? (
      <p className="text-sm text-muted-foreground">
        No prescription was issued for this consultation.
      </p>
    ) : (
      <Notice kind="error">Could not load the consultation record.</Notice>
    );
  }
  return rxQ.data ? <PrescriptionDetails rx={rxQ.data} /> : null;
}

/** Button that opens the full consultation record for an appointment in a
 *  sheet (bottom sheet on mobile, centred modal on desktop). */
export function ConsultationRecordButton({
  appointmentId,
  label = 'View consultation record',
  size = 'sm',
  variant = 'outline',
}: {
  appointmentId: string;
  label?: string;
  size?: React.ComponentProps<typeof Button>['size'];
  variant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button type="button" size={size} variant={variant}>
            <FileTextIcon className="size-4" />
            {label}
          </Button>
        }
      />
      <SheetContent title="Consultation record">
        <ConsultationRecord appointmentId={appointmentId} active={open} />
      </SheetContent>
    </Sheet>
  );
}
