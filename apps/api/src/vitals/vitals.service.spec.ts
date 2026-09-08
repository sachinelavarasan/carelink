import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import { VitalsService } from './vitals.service';

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy', 'limit']) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return c;
}

const row = {
  id: 'v1',
  recordedAt: new Date('2026-02-01T08:00:00Z'),
  weightKg: 72.5,
  systolic: 120,
  diastolic: 80,
  heartRate: null,
  bloodSugarMgDl: null,
  temperatureC: null,
  notes: 'morning',
  createdAt: new Date('2026-02-01T08:01:00Z'),
};

function makeService(opts: { rows?: unknown[]; shared?: unknown } = {}) {
  const returning = vi.fn().mockResolvedValue([row]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });
  const where = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where });
  const db = {
    query: {
      appointments: {
        findFirst: vi.fn().mockResolvedValue(opts.shared === undefined ? { id: 'ap1' } : opts.shared),
      },
    },
    select: () => chain(opts.rows ?? [row]),
    insert,
    delete: del,
  };
  return { service: new VitalsService({ db } as unknown as Database), values, where, del };
}

describe('VitalsService', () => {
  it('lists the patient\'s own readings, mapped to the wire shape', async () => {
    const { service } = makeService();
    const out = await service.listOwn('pat');
    expect(out.items).toHaveLength(1);
    expect(out.items[0]).toMatchObject({ id: 'v1', weightKg: 72.5, systolic: 120, heartRate: null });
  });

  it('inserts a reading with recordedAt defaulted to now when omitted', async () => {
    const { service, values } = makeService();
    await service.add('pat', { weightKg: 70 });
    const inserted = values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.patientId).toBe('pat');
    expect(inserted.weightKg).toBe(70);
    expect(inserted.recordedAt).toBeInstanceOf(Date);
    expect(inserted.systolic).toBeNull();
  });

  it('scopes delete to the owner', async () => {
    const { service, del, where } = makeService();
    await service.remove('pat', 'v1');
    expect(del).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
  });

  it('lets a doctor read a patient they have seen', async () => {
    const { service } = makeService({ shared: { id: 'ap1' } });
    const out = await service.listForPatient('doc', 'pat');
    expect(out.items).toHaveLength(1);
  });

  it('forbids a doctor with no shared appointment', async () => {
    const { service } = makeService({ shared: null });
    await expect(service.listForPatient('doc', 'pat')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
