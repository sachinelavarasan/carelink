import type { AvailabilityExceptionOut, AvailabilityRuleOut } from '@carelink/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Notice } from '../components/Notice';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { api, apiGet, errMessage } from '../lib/api';
import { isoDate } from '../lib/format';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface Row {
  enabled: boolean;
  startTime: string;
  endTime: string;
  slotMinutes: number;
}

const blankRow = (): Row => ({
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  slotMinutes: 30,
});

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

  const [rows, setRows] = useState<Row[]>(() => DAYS.map(blankRow));
  const [msg, setMsg] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!rulesQ.data) return;
    const next = DAYS.map(blankRow);
    for (const r of rulesQ.data) {
      next[r.weekday] = {
        enabled: true,
        startTime: r.startTime,
        endTime: r.endTime,
        slotMinutes: r.slotMinutes,
      };
    }
    setRows(next);
  }, [rulesQ.data]);

  const patch = (i: number, p: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  async function saveRules(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const rules = rows
      .map((r, weekday) => ({ ...r, weekday }))
      .filter((r) => r.enabled)
      .map((r) => ({
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        slotMinutes: r.slotMinutes,
        effectiveFrom: isoDate(new Date()),
      }));
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
      {msg && (
        <div className="mt-3">
          <Notice kind={msg.kind}>{msg.text}</Notice>
        </div>
      )}

      <Card className="mt-3">
        <CardContent>
          <form onSubmit={saveRules}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Open</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Slot (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={DAYS[i]}>
                    <TableCell>{DAYS[i]}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={r.enabled}
                        onCheckedChange={(v) => patch(i, { enabled: v === true })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        className="w-32"
                        value={r.startTime}
                        disabled={!r.enabled}
                        onChange={(e) => patch(i, { startTime: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        className="w-32"
                        value={r.endTime}
                        disabled={!r.enabled}
                        onChange={(e) => patch(i, { endTime: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={5}
                        max={120}
                        step={5}
                        className="w-20"
                        value={r.slotMinutes}
                        disabled={!r.enabled}
                        onChange={(e) => patch(i, { slotMinutes: Number(e.target.value) })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="submit" className="mt-4" disabled={busy}>
              {busy ? 'Saving…' : 'Save weekly hours'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Exceptions
        list={exceptionsQ.data ?? []}
        onChange={() => qc.invalidateQueries({ queryKey: ['availability-exceptions'] })}
      />
    </AppShell>
  );
}

function Exceptions({ list, onChange }: { list: AvailabilityExceptionOut[]; onChange: () => void }) {
  const [date, setDate] = useState('');
  const [closed, setClosed] = useState(true);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const [err, setErr] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await api.put('/me/availability/exceptions', {
        date,
        isClosed: closed,
        ...(closed ? {} : { startTime: start, endTime: end }),
      });
      setDate('');
      onChange();
    } catch (e2) {
      setErr(errMessage(e2, 'Could not save'));
    }
  }

  async function remove(id: string) {
    await api.delete(`/me/availability/exceptions/${id}`);
    onChange();
  }

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold">Date overrides</h2>
      {err && (
        <div className="mt-2">
          <Notice kind="error">{err}</Notice>
        </div>
      )}
      <ul className="my-2 grid gap-1 text-sm">
        {list.map((x) => (
          <li key={x.id} className="flex items-center gap-3">
            <span>{x.date}</span>
            <span className="text-muted-foreground">
              {x.isClosed ? 'closed' : `${x.startTime}–${x.endTime}`}
            </span>
            <button
              type="button"
              onClick={() => void remove(x.id)}
              className="text-destructive hover:underline"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          required
          className="w-40"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-sm">
          <Checkbox checked={closed} onCheckedChange={(v) => setClosed(v === true)} />
          closed
        </label>
        {!closed && (
          <>
            <Input
              type="time"
              className="w-32"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <Input
              type="time"
              className="w-32"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </>
        )}
        <Button type="submit" variant="outline" size="sm">
          Add
        </Button>
      </form>
    </section>
  );
}
