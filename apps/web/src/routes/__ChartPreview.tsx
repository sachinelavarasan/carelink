import type { AppointmentStatus } from '@carelink/shared';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { StatusBadge } from '../components/StatusBadge';
import { Card, CardContent } from '../components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../components/ui/chart';

const chartConfig = { count: { label: 'Appointments', color: 'var(--primary)' } } satisfies ChartConfig;
const daily = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.now() - (13 - i) * 86_400_000);
  return { date: d.toISOString().slice(0, 10), count: [0, 1, 2, 3, 4, 2, 1, 0, 3, 5, 4, 2, 1, 3][i] };
});
const dayTick = (iso: string) => String(new Date(`${iso}T00:00:00`).getDate());

const STATUS_COLOR: Record<AppointmentStatus, string> = {
  REQUESTED: 'var(--muted-foreground)',
  CONFIRMED: 'var(--primary)',
  COMPLETED: 'var(--success-fg)',
  CANCELLED: 'var(--danger-fg)',
  NO_SHOW: 'var(--warning-fg)',
};
const breakdown: { status: AppointmentStatus; count: number }[] = [
  { status: 'COMPLETED', count: 48 },
  { status: 'CONFIRMED', count: 6 },
  { status: 'CANCELLED', count: 5 },
  { status: 'NO_SHOW', count: 2 },
];
const total = breakdown.reduce((n, r) => n + r.count, 0);

export default function ChartPreview() {
  return (
    <div className="mx-auto grid max-w-3xl gap-4 p-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Upcoming', 5],
          ['Next 7 days', 3],
          ['Completed', 48],
          ['Patients seen', 31],
        ].map(([l, v]) => (
          <Card key={l as string} size="sm">
            <CardContent>
              <div className="text-sm text-muted-foreground">{l}</div>
              <div className="mt-1 text-2xl font-semibold">{v}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-medium">Appointments — last 14 days</h3>
          <ChartContainer config={chartConfig} className="h-40 w-full">
            <BarChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} tickFormatter={dayTick} />
              <YAxis width={28} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={4} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h3 className="mb-3 text-sm font-medium">Appointments by status</h3>
          <div className="grid gap-2">
            {breakdown.map((r) => (
              <div key={r.status} className="flex items-center gap-3">
                <div className="w-28 shrink-0">
                  <StatusBadge kind="appointment" status={r.status} />
                </div>
                <div className="h-2.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max((r.count / total) * 100, 3)}%`, background: STATUS_COLOR[r.status] }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {r.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
