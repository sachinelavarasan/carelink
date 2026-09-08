import { type AppointmentListItem, type AppointmentPage, AppointmentStatus } from '@carelink/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarX2Icon } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { CardGridSkeleton, cardGridClass } from '../components/CardGridSkeleton';
import { EmptyState } from '../components/EmptyState';
import { PreVisitSheet } from '../components/IntakeForm';
import { ConsultationRecordButton } from '../components/PrescriptionDetails';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { api, apiGet, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

const AppointmentsCalendar = lazy(() => import('./AppointmentsCalendar'));

// `completed` is a status filter, not a time window — it shows COMPLETED
// consultations whether their slot is in the past or (rarely) still ahead; a
// per-card "Past" / "Scheduled" badge tells them apart.
type Scope = 'upcoming' | 'completed';
type Mode = 'list' | 'calendar';

const scopeParams = (scope: Scope): Record<string, unknown> =>
  scope === 'completed' ? { scope: 'all', status: AppointmentStatus.COMPLETED } : { scope };

export default function Appointments() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('list');
  const [scope, setScope] = useState<Scope>('upcoming');
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['appointments', scope],
    queryFn: () => apiGet<AppointmentPage>('/appointments', scopeParams(scope)),
    enabled: mode === 'list',
  });

  const calendar = useQuery({
    queryKey: ['appointments', 'all'],
    queryFn: () => apiGet<AppointmentPage>('/appointments', { scope: 'all', limit: 100 }),
    enabled: mode === 'calendar',
  });

  async function cancel(id: string) {
    const reason = window.prompt('Reason for cancelling?')?.trim();
    if (!reason || reason.length < 3) return;
    setError(null);
    try {
      await api.post(`/appointments/${id}/cancel`, { reason });
      await qc.invalidateQueries({ queryKey: ['appointments'] });
    } catch (err) {
      setError(errMessage(err, 'Could not cancel'));
    }
  }

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <div className="mt-3">
          <Notice kind="error">{error}</Notice>
        </div>
      )}

      {mode === 'list' ? (
        <ListView
          data={list.data}
          isLoading={list.isLoading}
          scope={scope}
          onScope={setScope}
          role={me?.user.role}
          onCancel={cancel}
        />
      ) : (
        <Suspense
          fallback={
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> Loading calendar…
            </p>
          }
        >
          <AppointmentsCalendar
            data={calendar.data}
            isLoading={calendar.isLoading}
            role={me?.user.role}
            onCancel={cancel}
          />
        </Suspense>
      )}
    </AppShell>
  );
}

/* -------------------------------------------------------------------- list */

function ListView({
  data,
  isLoading,
  scope,
  onScope,
  role,
  onCancel,
}: {
  data: AppointmentPage | undefined;
  isLoading: boolean;
  scope: Scope;
  onScope: (s: Scope) => void;
  role: string | undefined;
  onCancel: (id: string) => void;
}) {
  return (
    <>
      <Tabs value={scope} onValueChange={(v) => onScope(v as Scope)} className="mb-4 mt-3">
        <TabsList
          variant="line"
          className="h-9 w-full justify-start gap-5 rounded-none border-b border-border p-0"
        >
          <TabsTrigger value="upcoming" className="flex-none px-1 pb-2 text-sm">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-none px-1 pb-2 text-sm">
            Completed
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && <CardGridSkeleton count={6} />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={CalendarX2Icon}
          title={scope === 'upcoming' ? 'No upcoming appointments' : 'No completed consultations'}
          description={
            scope === 'upcoming'
              ? role === 'PATIENT'
                ? 'Book a consultation with a doctor to see it here.'
                : 'Confirmed appointments will appear here.'
              : 'Consultations show up here once they are completed.'
          }
          action={
            scope === 'upcoming' && role === 'PATIENT' ? (
              <Link
                to="/doctors"
                className="text-sm text-primary underline underline-offset-4"
              >
                Find a doctor
              </Link>
            ) : undefined
          }
        />
      )}

      <div className={cardGridClass}>
        {data?.items.map((a) =>
          scope !== 'upcoming' ? (
            <PastCard key={a.id} a={a} />
          ) : (
            <Card key={a.id}>
              <CardContent className="grid gap-1">
                <div className="flex items-center justify-between gap-4">
                  <strong className="font-medium">{fmtDateTime(a.scheduledStart)}</strong>
                  <StatusBadge kind="appointment" status={a.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  with {a.counterpartyName}
                  {a.reasonForVisit ? ` — ${a.reasonForVisit}` : ''}
                </p>
                {a.status === 'CONFIRMED' && (
                  <div className="mt-1 flex items-center gap-4 text-sm">
                    {a.chatThreadId && (
                      <>
                        {/* Chat consultation hidden for now */}
                        <Link
                          className="text-primary underline underline-offset-4"
                          to={`/consult/${a.id}/video`}
                        >
                          Video call
                        </Link>
                        <Link
                          className="text-primary underline underline-offset-4"
                          to={`/appointments/${a.id}/prescription`}
                        >
                          Prescription
                        </Link>
                      </>
                    )}
                    {role === 'PATIENT' && <PreVisitSheet appointmentId={a.id} />}
                    {role === 'PATIENT' && (
                      <Link
                        className="text-primary underline underline-offset-4"
                        to={`/book?reschedule=${a.id}`}
                      >
                        Reschedule
                      </Link>
                    )}
                    <button
                      type="button"
                      className="text-destructive hover:underline"
                      onClick={() => onCancel(a.id)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- past card */

/** A completed / past appointment. Its full consultation record — the issued
 *  prescription and everything on it — opens in a sheet. View only. */
function PastCard({ a }: { a: AppointmentListItem }) {
  const isPast = new Date(a.scheduledEnd).getTime() < Date.now();

  return (
    <Card>
      <CardContent className="grid gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="font-medium">{fmtDateTime(a.scheduledStart)}</strong>
          <div className="flex items-center gap-1.5">
            <Badge variant={isPast ? 'secondary' : 'outline'}>
              {isPast ? 'Past' : 'Scheduled'}
            </Badge>
            <StatusBadge kind="appointment" status={a.status} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          with {a.counterpartyName}
          {a.reasonForVisit ? ` — ${a.reasonForVisit}` : ''}
        </p>

        <div className="mt-1 justify-self-start">
          <ConsultationRecordButton appointmentId={a.id} />
        </div>
      </CardContent>
    </Card>
  );
}
