import type { AppointmentStatus, AppointmentSummary } from '@carelink/shared';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  type LucideIcon,
  StethoscopeIcon,
  TrendingUpIcon,
  UsersRoundIcon,
} from 'lucide-react';
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
import { Skeleton } from './ui/skeleton';

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

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon aria-hidden className="size-4" />
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} size="sm">
          <CardContent className="grid gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-10" />
          </CardContent>
        </Card>
      ))}
    </div>
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
      <section className="mt-4">
        <StatRowSkeleton />
      </section>
    );
  }
  if (!data) return null;

  const outcomes = data.byStatus.COMPLETED + data.byStatus.CANCELLED + data.byStatus.NO_SHOW;
  const completionRate = outcomes > 0 ? Math.round((data.byStatus.COMPLETED / outcomes) * 100) : null;

  return (
    <section className="mt-4 grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={CalendarDaysIcon} label="Today" value={data.today} />
        {isDoctor ? (
          <>
            <Stat icon={CalendarClockIcon} label="Upcoming" value={data.upcoming} />
            <Stat icon={CalendarCheckIcon} label="Completed" value={data.completed} />
            <Stat icon={UsersRoundIcon} label="Patients" value={data.counterpartiesSeen} />
          </>
        ) : (
          <>
            <Stat
              icon={CalendarClockIcon}
              label="This week"
              value={data.next7Days}
              hint={`${data.upcoming} upcoming`}
            />
            <Stat icon={CalendarCheckIcon} label="Consultations" value={data.completed} />
            <Stat icon={StethoscopeIcon} label="Doctors seen" value={data.counterpartiesSeen} />
          </>
        )}
      </div>

      {isDoctor && (
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
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
            <CardContent className="grid gap-3">
              <div>
                <h3 className="text-sm font-medium">Completion rate</h3>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {completionRate == null ? '—' : `${completionRate}%`}
                  {completionRate != null && (
                    <TrendingUpIcon aria-hidden className="ml-1 inline size-4 text-success-fg" />
                  )}
                </p>
                <p className="text-xs text-muted-foreground">of finished consultations</p>
              </div>
              <div className="border-t border-border pt-3">
                <h3 className="mb-2 text-sm font-medium">By status</h3>
                <StatusBreakdown byStatus={data.byStatus} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
