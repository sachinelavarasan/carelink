import type { MedicalHistory as MedicalHistoryPage } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { apiGet, apiUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

export default function MedicalHistory() {
  const { patientId } = useParams();
  const { me } = useAuth();
  const doctorView = Boolean(patientId);
  const path = doctorView ? `/patients/${patientId}/history` : '/medical-history';

  const historyQ = useQuery({
    queryKey: ['medical-history', patientId ?? me?.user.id],
    queryFn: () => apiGet<MedicalHistoryPage>(path),
  });

  const items = historyQ.data?.items ?? [];

  return (
    <AppShell>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {doctorView ? `Patient history — ${items[0]?.patientName ?? ''}` : 'Medical history'}
        </h1>
        {doctorView && (
          <Link className="text-sm text-primary underline underline-offset-4" to="/appointments">
            ← Appointments
          </Link>
        )}
      </div>

      {historyQ.isLoading && (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}
      {historyQ.isError && (
        <Notice kind="error">Could not load the history.</Notice>
      )}
      {historyQ.data && items.length === 0 && (
        <p className="text-sm text-muted-foreground">No past consultations.</p>
      )}

      <div className="grid gap-3">
        {items.map((e) => (
          <Card key={e.appointmentId}>
            <CardContent className="grid gap-1">
              <div className="flex items-center justify-between gap-4">
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
                    {e.prescription.itemCount} medicine
                    {e.prescription.itemCount === 1 ? '' : 's'}
                    {e.prescription.followUpDate
                      ? ` · follow-up ${e.prescription.followUpDate}`
                      : ''}
                  </span>
                  <div className="mt-1 flex gap-3">
                    <Link
                      className="text-primary underline underline-offset-4"
                      to={`/appointments/${e.appointmentId}/prescription`}
                    >
                      Open
                    </Link>
                    {e.prescription.pdfReady && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            apiUrl(`/prescriptions/${e.prescription!.id}/pdf`),
                            '_blank',
                            'noopener',
                          )
                        }
                      >
                        PDF
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No prescription.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
