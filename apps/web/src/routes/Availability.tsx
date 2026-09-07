import type { AvailabilityExceptionOut, AvailabilityRuleOut } from '@carelink/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClockIcon, PlusIcon, XIcon } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { EmptyState } from '../components/EmptyState';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { api, apiGet, errMessage } from '../lib/api';
import { isoDate } from '../lib/format';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS = [1, 2, 3, 4, 5];
const LENGTHS = [10, 15, 20, 30, 45, 60];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const fmtHrs = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ') || '0h';
};

interface Win {
  start: string;
  end: string;
}
interface Day {
  enabled: boolean;
  windows: Win[];
}
const newWin = (): Win => ({ start: '09:00', end: '17:00' });
const emptyDay = (): Day => ({ enabled: false, windows: [newWin()] });
const winValid = (w: Win) => toMin(w.end) > toMin(w.start);

type Model = { length: number; days: Day[] };
const serialize = (m: Model) => JSON.stringify(m);

function fromRules(rules: AvailabilityRuleOut[]): Model {
  const days = DAYS.map(emptyDay);
  const byDay = new Map<number, AvailabilityRuleOut[]>();
  for (const r of rules) byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), r]);
  for (const [weekday, list] of byDay) {
    days[weekday] = {
      enabled: true,
      windows: list
        .slice()
        .sort((a, b) => toMin(a.startTime) - toMin(b.startTime))
        .map((r) => ({ start: r.startTime, end: r.endTime })),
    };
  }
  return { length: rules[0]?.slotMinutes ?? 30, days };
}

export default function Availability() {
  const qc = useQueryClient();
  const rulesQ = useQuery({
    queryKey: ['availability-rules'],
    queryFn: () => apiGet<AvailabilityRuleOut[]>('/me/availability/rules'),
  });
  const exceptionsQ = useQuery({
    queryKey: ['availability-exceptions'],
    queryFn: () => apiGet<AvailabilityExceptionOut[]>('/me/availability/exceptions'),
  });

  const [model, setModel] = useState<Model>({ length: 30, days: DAYS.map(emptyDay) });
  const baseline = useRef<string>(serialize(model));
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rulesQ.data) return;
    const next = fromRules(rulesQ.data);
    baseline.current = serialize(next);
    setModel(next);
  }, [rulesQ.data]);

  const { length, days } = model;
  const setDays = (fn: (d: Day[]) => Day[]) => setModel((m) => ({ ...m, days: fn(m.days) }));
  const patchDay = (i: number, p: Partial<Day>) =>
    setDays((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...p } : d)));
  const patchWin = (di: number, wi: number, p: Partial<Win>) =>
    setDays((ds) =>
      ds.map((d, idx) =>
        idx === di
          ? { ...d, windows: d.windows.map((w, j) => (j === wi ? { ...w, ...p } : w)) }
          : d,
      ),
    );
  const copyDay = (src: number, targets: number[]) =>
    setDays((ds) =>
      ds.map((d, idx) =>
        targets.includes(idx)
          ? { enabled: ds[src]!.enabled, windows: ds[src]!.windows.map((w) => ({ ...w })) }
          : d,
      ),
    );

  const dirty = serialize(model) !== baseline.current;
  const hasInvalid = days.some(
    (d) => d.enabled && (d.windows.length === 0 || d.windows.some((w) => !winValid(w))),
  );

  const summary = useMemo(() => {
    let minutes = 0;
    let slots = 0;
    for (const d of days) {
      if (!d.enabled) continue;
      for (const w of d.windows) {
        if (!winValid(w)) continue;
        const span = toMin(w.end) - toMin(w.start);
        minutes += span;
        slots += Math.floor(span / length);
      }
    }
    return { minutes, slots };
  }, [days, length]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const rules = days.flatMap((d, weekday) =>
      d.enabled
        ? d.windows
            .filter(winValid)
            .map((w) => ({
              weekday,
              startTime: w.start,
              endTime: w.end,
              slotMinutes: length,
              effectiveFrom: isoDate(new Date()),
            }))
        : [],
    );
    try {
      await api.put('/me/availability/rules', { rules });
      await qc.invalidateQueries({ queryKey: ['availability-rules'] });
      setMsg({ kind: 'success', text: 'Weekly hours saved.' });
    } catch (err) {
      setMsg({ kind: 'error', text: errMessage(err, 'Save failed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-xl font-semibold">Availability</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your weekly consulting hours. Patients book the slots these hours generate.
      </p>
      {msg && (
        <div className="mt-3">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}

      {rulesQ.isLoading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i}>
              <CardContent className="grid gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <form onSubmit={save}>
          <Card className="mt-4">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Consultation length</span>
                <Select
                  value={String(length)}
                  onValueChange={(v) => v && setModel((m) => ({ ...m, length: Number(v) }))}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...new Set([...LENGTHS, length])]
                      .sort((a, b) => a - b)
                      .map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} min
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{fmtHrs(summary.minutes)}</span> / week
                · <span className="font-medium text-foreground">{summary.slots}</span> slots
              </div>
            </CardContent>
          </Card>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {days.map((d, i) => (
              <Card key={DAYS[i]} className={d.enabled ? undefined : 'opacity-70'}>
                <CardContent className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 font-medium">
                      <Checkbox
                        checked={d.enabled}
                        onCheckedChange={(v) => patchDay(i, { enabled: v === true })}
                      />
                      {DAYS[i]}
                    </label>
                    {d.enabled && (
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            copyDay(
                              i,
                              WEEKDAYS.filter((w) => w !== i),
                            )
                          }
                        >
                          → weekdays
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            copyDay(
                              i,
                              [0, 1, 2, 3, 4, 5, 6].filter((w) => w !== i),
                            )
                          }
                        >
                          → all
                        </Button>
                      </div>
                    )}
                  </div>

                  {d.enabled &&
                    d.windows.map((w, wi) => {
                      const ok = winValid(w);
                      const slots = ok ? Math.floor((toMin(w.end) - toMin(w.start)) / length) : 0;
                      return (
                        <div key={wi} className="grid gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="time"
                              className="w-32"
                              value={w.start}
                              onChange={(e) => patchWin(i, wi, { start: e.target.value })}
                            />
                            <span className="text-muted-foreground">–</span>
                            <Input
                              type="time"
                              className="w-32"
                              value={w.end}
                              onChange={(e) => patchWin(i, wi, { end: e.target.value })}
                            />
                            <span className="text-xs text-muted-foreground">
                              {ok ? `${slots} slot${slots === 1 ? '' : 's'}` : 'end must be after start'}
                            </span>
                            {d.windows.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Remove window"
                                onClick={() =>
                                  patchDay(i, {
                                    windows: d.windows.filter((_, j) => j !== wi),
                                  })
                                }
                              >
                                <XIcon />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {d.enabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="justify-self-start"
                      onClick={() => patchDay(i, { windows: [...d.windows, newWin()] })}
                    >
                      <PlusIcon /> Add window
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button type="submit" disabled={busy || !dirty || hasInvalid}>
              {busy ? 'Saving…' : 'Save weekly hours'}
            </Button>
            {hasInvalid ? (
              <span className="text-sm text-destructive">Fix the highlighted hours first.</span>
            ) : dirty ? (
              <span className="text-sm text-muted-foreground">Unsaved changes</span>
            ) : null}
          </div>
        </form>
      )}

      <Exceptions
        list={exceptionsQ.data ?? []}
        loading={exceptionsQ.isLoading}
        onChange={() => qc.invalidateQueries({ queryKey: ['availability-exceptions'] })}
      />
    </AppShell>
  );
}

function Exceptions({
  list,
  loading,
  onChange,
}: {
  list: AvailabilityExceptionOut[];
  loading: boolean;
  onChange: () => void;
}) {
  const today = isoDate(new Date());
  const upcoming = list
    .filter((x) => x.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const [date, setDate] = useState('');
  const [mode, setMode] = useState<'closed' | 'custom'>('closed');
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const [err, setErr] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.put('/me/availability/exceptions', {
        date,
        isClosed: mode === 'closed',
        ...(mode === 'custom' ? { startTime: start, endTime: end } : {}),
      });
      setDate('');
      onChange();
    } catch (e2) {
      setErr(errMessage(e2, 'Could not save'));
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Remove this date override?')) return;
    await api.delete(`/me/availability/exceptions/${id}`);
    onChange();
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Date overrides</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Close a specific day or set different hours for it — takes priority over the weekly template.
      </p>
      {err && (
        <div className="mt-2">
          <Notice kind="error">{err}</Notice>
        </div>
      )}

      {loading ? (
        <Skeleton className="mt-3 h-16 w-full" />
      ) : upcoming.length === 0 ? (
        <div className="mt-3">
          <EmptyState icon={CalendarClockIcon} title="No upcoming overrides" />
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((x) => (
            <Card key={x.id} size="sm">
              <CardContent className="flex items-center justify-between gap-3">
                <span className="text-sm">
                  <strong className="font-medium">{x.date}</strong> ·{' '}
                  <span className="text-muted-foreground">
                    {x.isClosed ? 'Closed' : `${x.startTime}–${x.endTime}`}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove override"
                  onClick={() => void remove(x.id)}
                >
                  <XIcon />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          type="date"
          required
          min={today}
          className="w-40"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select value={mode} onValueChange={(v) => v && setMode(v as 'closed' | 'custom')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="custom">Custom hours</SelectItem>
          </SelectContent>
        </Select>
        {mode === 'custom' && (
          <>
            <Input
              type="time"
              className="w-32"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="time"
              className="w-32"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </>
        )}
        <Button type="submit" variant="outline" size="sm">
          Add override
        </Button>
      </form>
    </section>
  );
}
