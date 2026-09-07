import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import { AvailabilityService } from './availability.service';

/** A chainable, awaitable stand-in for a Drizzle query builder. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'where', 'groupBy', 'orderBy', 'leftJoin']) {
    c[m] = () => c;
  }
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return c;
}

const rows = [
  {
    id: 'd1',
    fullName: 'Dr. Beatriz Lima',
    specializations: ['Dermatology'],
    qualifications: 'MBBS, MD',
    yearsExperience: 6,
    bio: 'Skin and hair.',
    consultationFeeInr: 500,
    clinicName: null,
    verifiedAt: new Date(),
  },
  {
    id: 'd2',
    fullName: 'Dr. Aarav Shah',
    specializations: ['Cardiology', 'General Medicine'],
    qualifications: 'MBBS, DM',
    yearsExperience: 12,
    bio: 'Heart failure clinic.',
    consultationFeeInr: 800,
    clinicName: 'City Heart',
    verifiedAt: new Date(),
  },
  {
    id: 'd3',
    fullName: 'Dr. Unverified',
    specializations: ['Cardiology'],
    qualifications: 'MBBS',
    yearsExperience: 20,
    bio: null,
    consultationFeeInr: 100,
    clinicName: null,
    verifiedAt: null,
  },
];

function service(select: () => unknown) {
  return new AvailabilityService({ select } as unknown as Database);
}

describe('AvailabilityService.listDoctors', () => {
  it('hides unverified doctors and sorts by name by default', async () => {
    const s = service(() => chain(rows));
    const out = await s.listDoctors();
    expect(out.map((d) => d.id)).toEqual(['d2', 'd1']);
    expect(out).toHaveLength(2);
  });

  it('filters by specialization (case-insensitive)', async () => {
    const s = service(() => chain(rows));
    const out = await s.listDoctors({ specialization: 'cardiology' });
    expect(out.map((d) => d.id)).toEqual(['d2']);
  });

  it('matches the free-text query against name, bio and specialization', async () => {
    const s = service(() => chain(rows));
    expect((await s.listDoctors({ q: 'skin' })).map((d) => d.id)).toEqual(['d1']);
    expect((await s.listDoctors({ q: 'heart' })).map((d) => d.id)).toEqual(['d2']);
  });

  it('sorts by lowest fee and by experience', async () => {
    const s = service(() => chain(rows));
    expect((await s.listDoctors({ sort: 'fee' })).map((d) => d.id)).toEqual(['d1', 'd2']);
    expect((await s.listDoctors({ sort: 'experience' })).map((d) => d.id)).toEqual(['d2', 'd1']);
  });

  it('lists distinct specialization labels', async () => {
    const s = service(() => chain(rows));
    expect(await s.listSpecializations()).toEqual(['Cardiology', 'Dermatology', 'General Medicine']);
  });
});

describe('AvailabilityService.visitedDoctors', () => {
  it('joins grouped appointment history onto public doctor rows', async () => {
    const grouped = [
      { doctorId: 'd2', lastVisitedAt: '2026-02-01T09:00:00Z', visitCount: 3 },
      { doctorId: 'd1', lastVisitedAt: '2026-01-05T09:00:00Z', visitCount: 1 },
    ];
    const select = vi
      .fn()
      .mockReturnValueOnce(chain(grouped))
      .mockReturnValue(chain(rows));
    const s = service(select);

    const out = await s.visitedDoctors('patient-1');
    expect(out.map((d) => [d.id, d.visitCount])).toEqual([
      ['d2', 3],
      ['d1', 1],
    ]);
    expect(out[0].lastVisitedAt).toBe('2026-02-01T09:00:00.000Z');
  });

  it('returns nothing when the patient has no appointments', async () => {
    const s = service(vi.fn().mockReturnValue(chain([])));
    expect(await s.visitedDoctors('patient-1')).toEqual([]);
  });
});
