import type { AppointmentStatus, AppointmentSummary } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { apiGet } from '../lib/api';
import { useAuth } from '../lib/auth';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent } from './ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import { Spinner } from './Spinner';

const chartConfig = {
  count: { label: 'Appointments', color: 'var(--primary)' },
} satisfies ChartConfig;

const dayTick = (iso: string) => String(new Date(`${iso}T00:00:00`).getDate());
const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

// Chart-context colour per status. Five mutually distinct hues (no two reds), so
// the segments are legible for colour-vision deficiency; identity is still
// carried by the StatusBadge (icon + label) beside every row.
const STATUS_COLOR: Record<AppointmentStatus, string> = {
  REQUESTED: 'var(--muted-foreground)',
  CONFIRMED: 'var(--primary)',
  COMPLETED: 'var(--success-fg)',
  CANCELLED: 'var(--danger-fg)',
  NO_SHOW: 'var(--warning-fg)',
};
const STATUS_ORDER: AppointmentStatus[] = [
  'COMPLETED',
  'CONFIRMED',
  'REQUESTED',
  'CANCELLED',
  'NO_SHOW',
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBreakdown({ byStatus }: { byStatus: AppointmentSummary['byStatus'] }) {
  const rows = STATUS_ORDER.map((s) => ({ status: s, count: byStatus[s] })).filter(
    (r) => r.count > 0,
  );
  const total = rows.reduce((n, r) => n + r.count, 0);

  if (total === 0) {
    return <p className="text-sm text-muted-foreground">No appointments yet.</p>;
  }

  return (
    <div className="grid gap-2">
      {rows.map((r) => (
        <div key={r.status} className="flex items-center gap-3">
          <div className="w-28 shrink-0">
            <StatusBadge kind="appointment" status={r.status} />
          </div>
          <div className="h-2.5 flex-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max((r.count / total) * 100, 3)}%`,
                background: STATUS_COLOR[r.status],
              }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DashboardSummary() {
  const { me } = useAuth();
  const isDoctor = me?.user.role === 'DOCTOR';

  const { data, isLoading } = useQuery({
    queryKey: ['appointment-summary'],
    queryFn: () => apiGet<AppointmentSummary>('/appointments/summary'),
  });

  if (isLoading) {
    return (
      <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner /> Loading summary…
      </p>
    );
  }
  if (!data) return null;

  return (
    <section className="mt-4">
      <div className={isDoctor ? 'grid grid-cols-2 gap-3 sm:grid-cols-4' : 'grid grid-cols-3 gap-3'}>
        <Stat label="Upcoming" value={data.upcoming} />
        <Stat label="Next 7 days" value={data.next7Days} />
        <Stat label="Completed" value={data.completed} />
        {isDoctor && <Stat label="Patients seen" value={data.patientsSeen} />}
      </div>

      {isDoctor && (
        <div className="mt-3 grid gap-3">
          <Card>
            <CardContent>
              <h3 className="mb-3 text-sm font-medium">Appointments — last 14 days</h3>
              <ChartContainer config={chartConfig} className="h-40 w-full">
                <BarChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="0" />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={16}
                    tickFormatter={dayTick}
                  />
                  <YAxis
                    width={28}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={4}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(_, p) => dayLabel(String(p[0]?.payload.date))}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="mb-3 text-sm font-medium">Appointments by status</h3>
              <StatusBreakdown byStatus={data.byStatus} />
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
