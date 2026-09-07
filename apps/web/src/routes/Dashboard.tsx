import type { AppointmentPage } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { DashboardSummary } from '../components/DashboardSummary';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

export default function Dashboard() {
  const { me } = useAuth();
  const isDoctor = me?.user.role === 'DOCTOR';
  const profileComplete = isDoctor ? Boolean(me?.doctorProfile) : Boolean(me?.patientProfile);

  const next = useQuery({
    queryKey: ['appointments', 'upcoming'],
    queryFn: () => apiGet<AppointmentPage>('/appointments', { scope: 'upcoming', limit: 3 }),
  });

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

      <DashboardSummary />

      <h2 className="mt-6 text-base font-semibold">Next up</h2>
      {next.isLoading && (
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}
      {next.data && next.data.items.length === 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          No upcoming appointments.{' '}
          {!isDoctor && (
            <Link className="text-primary underline underline-offset-4" to="/doctors">
              Find a doctor →
            </Link>
          )}
        </p>
      )}
      <div className="mt-2 grid gap-2">
        {next.data?.items.map((a) => (
          <Card key={a.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              <span className="text-sm">
                <strong className="font-medium">{fmtDateTime(a.scheduledStart)}</strong> · with{' '}
                {a.counterpartyName}
              </span>
              <StatusBadge kind="appointment" status={a.status} />
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
