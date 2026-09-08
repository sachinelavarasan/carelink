import type { Vital } from '@carelink/shared';
import { ActivityIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { EmptyState } from './EmptyState';
import { Button } from './ui/button';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const shortDateYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

/** Metrics that can be charted. Blood pressure draws two lines. */
type MetricKey = 'weight' | 'bp' | 'heartRate' | 'bloodSugar' | 'temperature';
interface Metric {
  key: MetricKey;
  label: string;
  unit: string;
  /** Keys on Vital this metric reads; a datapoint counts if any is non-null. */
  fields: (keyof Vital)[];
  lines: { dataKey: string; name: string; color: string }[];
}
const METRICS: Metric[] = [
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    fields: ['weightKg'],
    lines: [{ dataKey: 'weightKg', name: 'Weight', color: 'var(--primary)' }],
  },
  {
    key: 'bp',
    label: 'Blood pressure',
    unit: 'mmHg',
    fields: ['systolic', 'diastolic'],
    lines: [
      { dataKey: 'systolic', name: 'Systolic', color: 'var(--primary)' },
      { dataKey: 'diastolic', name: 'Diastolic', color: 'var(--muted-foreground)' },
    ],
  },
  {
    key: 'heartRate',
    label: 'Heart rate',
    unit: 'bpm',
    fields: ['heartRate'],
    lines: [{ dataKey: 'heartRate', name: 'Heart rate', color: 'var(--primary)' }],
  },
  {
    key: 'bloodSugar',
    label: 'Blood sugar',
    unit: 'mg/dL',
    fields: ['bloodSugarMgDl'],
    lines: [{ dataKey: 'bloodSugarMgDl', name: 'Blood sugar', color: 'var(--primary)' }],
  },
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    fields: ['temperatureC'],
    lines: [{ dataKey: 'temperatureC', name: 'Temperature', color: 'var(--primary)' }],
  },
];

function VitalsChart({ items }: { items: Vital[] }) {
  // Oldest → newest for a left-to-right time axis.
  const series = useMemo(
    () => [...items].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)),
    [items],
  );
  const available = useMemo(
    () => METRICS.filter((m) => series.some((v) => m.fields.some((f) => v[f] != null))),
    [series],
  );
  const [metricKey, setMetricKey] = useState<MetricKey | null>(null);
  const metric = available.find((m) => m.key === metricKey) ?? available[0];

  if (!metric) return null;

  const chartConfig = Object.fromEntries(
    metric.lines.map((l) => [l.dataKey, { label: l.name, color: l.color }]),
  ) satisfies ChartConfig;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Trend</h3>
        <Select
          value={metric.key}
          onValueChange={(v) => v && setMetricKey(v as MetricKey)}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {available.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ChartContainer config={chartConfig} className="h-52 w-full">
        <LineChart data={series} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="0" />
          <XAxis
            dataKey="recordedAt"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={shortDate}
          />
          <YAxis width={36} tickLine={false} axisLine={false} tickMargin={4} domain={['auto', 'auto']} />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, p) => shortDateYear(String(p[0]?.payload.recordedAt))}
              />
            }
          />
          {metric.lines.map((l) => (
            <Line
              key={l.dataKey}
              type="monotone"
              dataKey={l.dataKey}
              name={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">Showing {metric.label.toLowerCase()} ({metric.unit}).</p>
    </div>
  );
}

const NUM = (n: number | null, suffix = '') => (n == null ? '—' : `${n}${suffix}`);

function VitalsTable({
  items,
  onDelete,
}: {
  items: Vital[];
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Weight</TableHead>
            <TableHead className="text-right">BP</TableHead>
            <TableHead className="text-right">HR</TableHead>
            <TableHead className="text-right">Sugar</TableHead>
            <TableHead className="text-right">Temp</TableHead>
            <TableHead>Notes</TableHead>
            {onDelete && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="whitespace-nowrap">{shortDateYear(v.recordedAt)}</TableCell>
              <TableCell className="text-right tabular-nums">{NUM(v.weightKg, ' kg')}</TableCell>
              <TableCell className="text-right tabular-nums">
                {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{NUM(v.heartRate)}</TableCell>
              <TableCell className="text-right tabular-nums">{NUM(v.bloodSugarMgDl)}</TableCell>
              <TableCell className="text-right tabular-nums">{NUM(v.temperatureC, '°')}</TableCell>
              <TableCell className="max-w-[16ch] truncate text-muted-foreground">{v.notes}</TableCell>
              {onDelete && (
                <TableCell className="text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Delete reading"
                    onClick={() => onDelete(v.id)}
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Chart + table for a set of vitals readings. Pass `onDelete` for the owner's
 *  editable view; omit it for a doctor's read-only view. */
export function VitalsPanel({
  items,
  onDelete,
}: {
  items: Vital[];
  onDelete?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        title="No readings yet"
        description="Vital signs recorded here build a trend over time."
      />
    );
  }
  return (
    <div className="grid gap-5">
      {items.length >= 2 && <VitalsChart items={items} />}
      <VitalsTable items={items} onDelete={onDelete} />
    </div>
  );
}
