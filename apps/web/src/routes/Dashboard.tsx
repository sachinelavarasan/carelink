import type {
  AppointmentPage,
  AppointmentSummary,
  MedicalHistory,
  VisitedPatient,
} from '@carelink/shared';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { CalendarPlusIcon, FileClockIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardSummary } from '../components/DashboardSummary';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { ConsultationRecordButton } from '../components/PrescriptionDetails';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

/** "Today", "Tomorrow", or a short weekday for anything further out. */
function relativeDay(iso: string): string {
  const d = new Date(iso);
  const days = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export default function Dashboard() {
  const { me } = useAuth();
  const isDoctor = me?.user.role === 'DOCTOR';
  const profileComplete = isDoctor ? Boolean(me?.doctorProfile) : Boolean(me?.patientProfile);

  const summary = useQuery({
    queryKey: ['appointment-summary'],
    queryFn: () => apiGet<AppointmentSummary>('/appointments/summary'),
  });
  const upcoming = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => apiGet<AppointmentPage>('/appointments', { scope: 'upcoming', limit: 5 }),
  });
  const recentHistory = useQuery({
    queryKey: ['medical-history', 'recent'],
    queryFn: () => apiGet<MedicalHistory>('/medical-history', { limit: 3 }),
    enabled: !isDoctor,
  });
  const recentPatients = useQuery({
    queryKey: ['my-patients'],
    queryFn: () => apiGet<VisitedPatient[]>('/me/patients'),
    enabled: isDoctor,
  });

  const items = upcoming.data?.items ?? [];
  const todays = items.filter((a) => isToday(a.scheduledStart));

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Hi, {me?.user.fullName.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {me?.user.role.toLowerCase()} · {me?.user.email}
      </p>

      {!profileComplete && (
        <div className="mt-4">
          <Notice kind="warning">
            Your profile isn&apos;t complete.{' '}
            <Link className="font-medium underline underline-offset-4" to="/profile">
              Fill it in →
            </Link>
          </Notice>
        </div>
      )}

      {!isDoctor && (summary.data?.followUpsDue ?? 0) > 0 && (
        <div className="mt-4">
          <Notice kind="warning">
            You have {summary.data!.followUpsDue} follow-up
            {summary.data!.followUpsDue === 1 ? '' : 's'} due in the next two weeks.{' '}
            <Link className="font-medium underline underline-offset-4" to="/history">
              Review →
            </Link>
          </Notice>
        </div>
      )}
      {isDoctor && (summary.data?.pendingRecords ?? 0) > 0 && (
        <div className="mt-4">
          <Notice kind="warning">
            {summary.data!.pendingRecords} draft prescription
            {summary.data!.pendingRecords === 1 ? '' : 's'} still to finish.{' '}
            <Link className="font-medium underline underline-offset-4" to="/appointments">
              Go to appointments →
            </Link>
          </Notice>
        </div>
      )}

      <DashboardSummary />

      {/* schedule -------------------------------------------------------- */}
      <h2 className="mt-6 text-base font-semibold">
        {isDoctor ? "Today's schedule" : 'Next up'}
      </h2>

      {upcoming.isLoading && (
        <div className="mt-2 grid gap-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Card key={i} size="sm">
              <CardContent className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {upcoming.data &&
        ((isDoctor ? todays : items).length === 0 ? (
          <div className="mt-2">
            <EmptyState
              icon={CalendarPlusIcon}
              title={isDoctor ? 'Nothing scheduled today' : 'No upcoming appointments'}
              description={
                isDoctor
                  ? `${items.length} appointment${items.length === 1 ? '' : 's'} still ahead this week.`
                  : 'Book a consultation to see it here.'
              }
              action={
                !isDoctor ? (
                  <Link className="text-sm text-primary underline underline-offset-4" to="/doctors">
                    Find a doctor
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="mt-2 grid gap-2">
            {(isDoctor ? todays : items).map((a) => (
              <Card key={a.id} size="sm">
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm">
                    <strong className="font-medium">{relativeDay(a.scheduledStart)}</strong>{' '}
                    {fmtDateTime(a.scheduledStart)} · with {a.counterpartyName}
                  </span>
                  <div className="flex items-center gap-3">
                    {a.chatThreadId && a.status === 'CONFIRMED' && (
                      <Link
                        className="text-sm text-primary underline underline-offset-4"
                        to={`/consult/${a.id}/video`}
                      >
                        Video call
                      </Link>
                    )}
                    <StatusBadge kind="appointment" status={a.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}

      {/* recent -------------------------------------------------------- */}
      {isDoctor ? (
        <RecentPatients q={recentPatients} />
      ) : (
        <RecentConsultations q={recentHistory} />
      )}
    </AppShell>
  );
}

function RecentConsultations({ q }: { q: UseQueryResult<MedicalHistory> }) {
  const entries = (q.data?.items ?? []).filter((e) => e.prescription);
  if (q.isLoading || entries.length === 0) return null;

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Recent consultations</h2>
        <Link className="text-sm text-primary underline underline-offset-4" to="/history">
          All history →
        </Link>
      </div>
      <div className="mt-2 grid gap-2">
        {entries.map((e) => (
          <Card key={e.appointmentId} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">
                <strong className="font-medium">{fmtDateTime(e.scheduledStart)}</strong> ·{' '}
                {e.doctorName} · {e.prescription!.diagnosis}
              </span>
              <ConsultationRecordButton
                appointmentId={e.appointmentId}
                record={e.prescription}
                label="View"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function RecentPatients({ q }: { q: UseQueryResult<VisitedPatient[]> }) {
  const patients = (q.data ?? []).slice(0, 3);
  if (q.isLoading || patients.length === 0) return null;

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Recent patients</h2>
        <Link className="text-sm text-primary underline underline-offset-4" to="/patients">
          All patients →
        </Link>
      </div>
      <div className="mt-2 grid gap-2">
        {patients.map((p) => (
          <Card key={p.id} size="sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm">
                <strong className="font-medium">{p.fullName}</strong> · last seen{' '}
                {fmtDateTime(p.lastVisitedAt)} · {p.visitCount} visit
                {p.visitCount === 1 ? '' : 's'}
              </span>
              <Link
                className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
                to={`/patients/${p.id}/history`}
              >
                <FileClockIcon aria-hidden className="size-4" />
                History
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
