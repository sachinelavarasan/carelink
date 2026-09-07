import { describe, expect, it } from 'vitest';
import { expandSlots, type RuleLike } from './slots';

// 2025-01-06 is a Monday (weekday 1).
const MONDAY = '2025-01-06';
const TUESDAY = '2025-01-07';
const now = new Date('2025-01-01T00:00:00Z'); // well before, so lead time never bites

const mondayRule: RuleLike = {
  weekday: 1,
  startTime: '09:00',
  endTime: '12:00',
  slotMinutes: 30,
  effectiveFrom: '2024-01-01',
  effectiveTo: null,
};

describe('expandSlots', () => {
  it('chunks a window into slotMinutes slots', () => {
    const slots = expandSlots([mondayRule], [], [], { from: MONDAY, to: MONDAY, now });
    expect(slots).toHaveLength(6); // 09:00–12:00 / 30m
    expect(slots[0].start).toBe('2025-01-06T03:30:00.000Z'); // 09:00 IST = 03:30 UTC
    expect(slots[5].end).toBe('2025-01-06T06:30:00.000Z'); // 12:00 IST
  });

  it('only emits slots on matching weekdays', () => {
    const slots = expandSlots([mondayRule], [], [], { from: MONDAY, to: TUESDAY, now });
    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s.start.startsWith('2025-01-06'))).toBe(true);
  });

  it('drops a slot that overlaps a booking', () => {
    const booked = [
      { start: new Date('2025-01-06T04:00:00Z'), end: new Date('2025-01-06T04:30:00Z') },
    ];
    const slots = expandSlots([mondayRule], [], booked, { from: MONDAY, to: MONDAY, now });
    expect(slots).toHaveLength(5);
    expect(slots.find((s) => s.start === '2025-01-06T04:00:00.000Z')).toBeUndefined();
  });

  it('skips a closed exception day', () => {
    const slots = expandSlots([mondayRule], [{ date: MONDAY, isClosed: true }], [], {
      from: MONDAY,
      to: MONDAY,
      now,
    });
    expect(slots).toHaveLength(0);
  });

  it('honours modified hours from an open exception', () => {
    const slots = expandSlots(
      [mondayRule],
      [{ date: MONDAY, isClosed: false, startTime: '10:00', endTime: '11:00' }],
      [],
      { from: MONDAY, to: MONDAY, now },
    );
    expect(slots).toHaveLength(2);
    expect(slots[0].start).toBe('2025-01-06T04:30:00.000Z'); // 10:00 IST
  });

  it('respects the lead time', () => {
    const slots = expandSlots([mondayRule], [], [], {
      from: MONDAY,
      to: MONDAY,
      now: new Date('2025-01-06T04:15:00Z'), // 09:45 IST
      leadTimeMinutes: 60,
    });
    // earliest bookable = 10:45 IST -> first full slot is 11:00 IST
    expect(slots[0].start).toBe('2025-01-06T05:30:00.000Z');
    expect(slots).toHaveLength(2);
  });

  it('ignores rules outside their effective window', () => {
    const expired = { ...mondayRule, effectiveTo: '2024-12-31' };
    expect(expandSlots([expired], [], [], { from: MONDAY, to: MONDAY, now })).toHaveLength(0);
  });
});
