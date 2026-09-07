import type { AppointmentPage } from '@carelink/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Spinner } from '../components/Spinner';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { api, apiGet, errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { fmtDateTime } from '../lib/format';

const AppointmentsCalendar = lazy(() => import('./AppointmentsCalendar'));

type Scope = 'upcoming' | 'past';
type Mode = 'list' | 'calendar';

export default function Appointments() {
  const { me } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('list');
  const [scope, setScope] = useState<Scope>('upcoming');
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['appointments', scope],
    queryFn: () => apiGet<AppointmentPage>('/appointments', { scope }),
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
      <Tabs value={scope} onValueChange={(v) => onScope(v as Scope)} className="my-3">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Loading…
        </p>
      )}
      {data && data.items.length === 0 && (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      )}

      <div className="grid gap-3">
        {data?.items.map((a) => (
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
              {scope === 'upcoming' && a.status === 'CONFIRMED' && (
                <div className="mt-1 flex items-center gap-4 text-sm">
                  {a.chatThreadId && (
                    <Link
                      className="text-primary underline underline-offset-4"
                      to={`/consult/${a.id}`}
                    >
                      Open consultation
                    </Link>
                  )}
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
        ))}
      </div>
    </>
  );
}
