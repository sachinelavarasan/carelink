import type { Slot } from '@carelink/shared';

/**
 * The clinic operates in a single fixed timezone (India, no DST). "HH:mm" times
 * in availability rules are interpreted here.
 */
export const CLINIC_UTC_OFFSET = '+05:30';

export interface RuleLike {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  slotMinutes: number;
  effectiveFrom: string; // "YYYY-MM-DD"
  effectiveTo?: string | null;
}

export interface ExceptionLike {
  date: string; // "YYYY-MM-DD"
  isClosed: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface Booking {
  start: Date;
  end: Date;
}

export interface ExpandOptions {
  from: string; // inclusive "YYYY-MM-DD"
  to: string; // inclusive "YYYY-MM-DD"
  now?: Date;
  leadTimeMinutes?: number; // earliest bookable slot, from `now`
}

const MINUTE = 60_000;

function instant(date: string, hhmm: string): Date {
  return new Date(`${date}T${hhmm}:00${CLINIC_UTC_OFFSET}`);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday of a "YYYY-MM-DD" date in the clinic timezone (0 = Sunday). */
function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00${CLINIC_UTC_OFFSET}`).getUTCDay();
}

/**
 * Expands weekly rules + date exceptions into concrete bookable slots for a date
 * range, minus `booked` intervals and anything before `now + leadTime`.
 */
export function expandSlots(
  rules: RuleLike[],
  exceptions: ExceptionLike[],
  booked: Booking[],
  opts: ExpandOptions,
): Slot[] {
  const now = opts.now ?? new Date();
  const earliest = new Date(now.getTime() + (opts.leadTimeMinutes ?? 60) * MINUTE);
  const exByDate = new Map(exceptions.map((e) => [e.date, e]));
  const slots: Slot[] = [];

  for (let date = opts.from; date <= opts.to; date = addDays(date, 1)) {
    const ex = exByDate.get(date);
    if (ex?.isClosed) continue;

    const weekday = weekdayOf(date);
    let windows: { startTime: string; endTime: string; slotMinutes: number }[];

    if (ex && ex.startTime && ex.endTime) {
      const ruleForDay = rules.find((r) => r.weekday === weekday);
      windows = [
        { startTime: ex.startTime, endTime: ex.endTime, slotMinutes: ruleForDay?.slotMinutes ?? 30 },
      ];
    } else {
      windows = rules
        .filter(
          (r) =>
            r.weekday === weekday &&
            r.effectiveFrom <= date &&
            (!r.effectiveTo || r.effectiveTo >= date),
        )
        .map((r) => ({ startTime: r.startTime, endTime: r.endTime, slotMinutes: r.slotMinutes }));
    }

    for (const w of windows) {
      const windowEnd = instant(date, w.endTime).getTime();
      const step = w.slotMinutes * MINUTE;
      for (let s = instant(date, w.startTime).getTime(); s + step <= windowEnd; s += step) {
        const start = new Date(s);
        const end = new Date(s + step);
        if (start < earliest) continue;
        if (booked.some((b) => b.start < end && b.end > start)) continue;
        slots.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start));
  return dedupe(slots);
}

function dedupe(slots: Slot[]): Slot[] {
  const seen = new Set<string>();
  return slots.filter((s) => {
    if (seen.has(s.start)) return false;
    seen.add(s.start);
    return true;
  });
}
