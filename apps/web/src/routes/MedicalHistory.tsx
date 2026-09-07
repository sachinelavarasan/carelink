import type { MedicalHistoryEntry, MedicalHistory as MedicalHistoryPage } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { FileClockIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { BackLink } from '../components/BackLink';
import { CardGridSkeleton, cardGridClass } from '../components/CardGridSkeleton';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { ConsultationRecordButton, PdfButton } from '../components/PrescriptionDetails';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

export default function MedicalHistory() {
  // Three entry points share this screen:
  //  /patients/:patientId/history   → doctor viewing one patient
  //  /my-doctors/:doctorId          → patient, history filtered to one doctor
  //  /history                       → patient, everything
  const { patientId, doctorId } = useParams();
  const { me } = useAuth();
  const doctorView = Boolean(patientId);

  const path = doctorView ? `/patients/${patientId}/history` : '/medical-history';
  const params = !doctorView && doctorId ? { doctorId } : undefined;

  const historyQ = useQuery({
    queryKey: ['medical-history', patientId ?? doctorId ?? me?.user.id],
    queryFn: () => apiGet<MedicalHistoryPage>(path, params),
  });

  const items = historyQ.data?.items ?? [];

  const title = doctorView
    ? `Patient history — ${items[0]?.patientName ?? ''}`
    : doctorId
      ? `History with ${items[0]?.doctorName ?? 'this doctor'}`
      : 'Medical history';
  const backTo = doctorView ? '/patients' : doctorId ? '/my-doctors' : null;

  return (
    <AppShell>
      {backTo && (
        <BackLink to={backTo}>{backTo === '/patients' ? 'Patients' : 'My doctors'}</BackLink>
      )}
      <h1 className="mb-3 text-xl font-semibold">{title}</h1>

      {historyQ.isLoading && <CardGridSkeleton count={6} />}
      {historyQ.isError && <Notice kind="error">Could not load the history.</Notice>}
      {historyQ.data && items.length === 0 && (
        <EmptyState
          icon={FileClockIcon}
          title="No consultations yet"
          description={
            doctorView
              ? 'This patient has no past consultations with you.'
              : doctorId
                ? 'You have no past consultations with this doctor.'
                : 'Your consultations and prescriptions will appear here.'
          }
        />
      )}

      <div className={cardGridClass}>
        {items.map((e) => (
          <HistoryCard key={e.appointmentId} e={e} doctorView={doctorView} />
        ))}
      </div>
    </AppShell>
  );
}

/** One past consultation — a summary; the full record opens in a sheet. */
function HistoryCard({ e, doctorView }: { e: MedicalHistoryEntry; doctorView: boolean }) {
  return (
    <Card>
      <CardContent className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="font-medium">{fmtDateTime(e.scheduledStart)}</strong>
          <StatusBadge kind="appointment" status={e.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {doctorView ? e.patientName : e.doctorName}
          {e.reasonForVisit ? ` — ${e.reasonForVisit}` : ''}
        </p>

        {e.prescription ? (
          <div className="mt-1 grid gap-1 text-sm">
            <span>
              <span className="text-muted-foreground">Diagnosis: </span>
              {e.prescription.diagnosis}
            </span>
            <span className="text-muted-foreground">
              {e.prescription.items.length} medicine
              {e.prescription.items.length === 1 ? '' : 's'}
              {e.prescription.followUpDate
                ? ` · follow-up ${e.prescription.followUpDate}`
                : ''}
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ConsultationRecordButton
                appointmentId={e.appointmentId}
                record={e.prescription}
                label="View details"
              />
              <Link
                className="text-sm text-primary underline underline-offset-4"
                to={`/appointments/${e.appointmentId}/prescription`}
              >
                Open full page
              </Link>
              {e.prescription.pdfReady && (
                <PdfButton
                  prescriptionId={e.prescription.id}
                  variant="outline"
                  size="sm"
                  label="PDF"
                />
              )}
            </div>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">No prescription.</p>
        )}
      </CardContent>
    </Card>
  );
}
