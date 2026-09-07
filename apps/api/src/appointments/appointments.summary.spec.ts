import { describe, expect, it } from 'vitest';
import { AppointmentsService } from './appointments.service';

function serviceWithRows(
  rows: Array<{ status: string; start: Date; end: Date; patientId?: string }>,
) {
  const db = {
    select: () => ({ from: () => ({ where: () => Promise.resolve(rows) }) }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new AppointmentsService(db as any, {} as any, {} as any);
}

const user = { id: 'u1', role: 'DOCTOR' as const };

describe('AppointmentsService.summary', () => {
  it('counts upcoming / next 7 days / completed and buckets 14 days', async () => {
    const now = Date.now();
    const rows = [
      // completed in the past (two distinct patients)
      { status: 'COMPLETED', start: new Date(now - 3 * 86_400_000), end: new Date(now - 3 * 86_400_000), patientId: 'p1' },
      { status: 'COMPLETED', start: new Date(now - 10 * 86_400_000), end: new Date(now - 10 * 86_400_000), patientId: 'p2' },
      // upcoming, within 7 days
      { status: 'CONFIRMED', start: new Date(now + 2 * 86_400_000), end: new Date(now + 2 * 86_400_000 + 1800_000), patientId: 'p1' },
      // upcoming, beyond 7 days
      { status: 'CONFIRMED', start: new Date(now + 20 * 86_400_000), end: new Date(now + 20 * 86_400_000 + 1800_000), patientId: 'p3' },
      // cancelled — ignored in the counts/buckets but still tallied byStatus
      { status: 'CANCELLED', start: new Date(now - 1 * 86_400_000), end: new Date(now - 1 * 86_400_000), patientId: 'p2' },
      // outside the 14-day window — not in daily buckets; same patient as p1
      { status: 'COMPLETED', start: new Date(now - 30 * 86_400_000), end: new Date(now - 30 * 86_400_000), patientId: 'p1' },
    ];

    const summary = await serviceWithRows(rows).summary(user);

    expect(summary.upcoming).toBe(2);
    expect(summary.next7Days).toBe(1);
    expect(summary.completed).toBe(3);
    expect(summary.daily).toHaveLength(14);
    // buckets are chronologically ordered ISO dates ending today
    expect(summary.daily.map((d) => d.date)).toEqual([...summary.daily.map((d) => d.date)].sort());
    // only the two in-window, non-cancelled, past-dated rows land in buckets
    expect(summary.daily.reduce((n, d) => n + d.count, 0)).toBe(2);
    expect(summary.byStatus).toEqual({
      REQUESTED: 0,
      CONFIRMED: 2,
      CANCELLED: 1,
      COMPLETED: 3,
      NO_SHOW: 0,
    });
    expect(summary.patientsSeen).toBe(2); // p1, p2 — distinct COMPLETED patients
  });
});
