import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import { PrescriptionTemplatesService } from './prescription-templates.service';

function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['from', 'where', 'orderBy']) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return c;
}

const stored = {
  id: 't1',
  name: 'Viral URI',
  symptoms: null,
  diagnosis: 'viral upper respiratory infection',
  advice: 'rest, fluids',
  followUpDays: 5,
  drugCategoryFlags: ['OTC'],
  items: [{ drugName: 'Paracetamol', frequency: 'tds', durationDays: 3 }],
  createdAt: new Date('2026-02-01T00:00:00Z'),
  updatedAt: new Date('2026-02-02T00:00:00Z'),
};

function makeService(opts: { rows?: unknown[]; owner?: { doctorId: string } | null } = {}) {
  const returning = vi.fn().mockResolvedValue([stored]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });
  const setWhere = vi.fn().mockReturnValue({ returning });
  const update = vi.fn().mockReturnValue({ set: () => ({ where: setWhere }) });
  const delWhere = vi.fn().mockResolvedValue(undefined);
  const del = vi.fn().mockReturnValue({ where: delWhere });
  const db = {
    query: {
      prescriptionTemplates: {
        findFirst: vi
          .fn()
          .mockResolvedValue(opts.owner === undefined ? { doctorId: 'doc' } : opts.owner),
      },
    },
    select: () => chain(opts.rows ?? [stored]),
    insert,
    update,
    delete: del,
  };
  return {
    service: new PrescriptionTemplatesService({ db } as unknown as Database),
    values,
    del,
    delWhere,
  };
}

const body = {
  name: 'Viral URI',
  diagnosis: 'viral URI',
  advice: 'rest',
  followUpDays: 5,
  drugCategoryFlags: [] as never[],
  items: [] as never[],
};

describe('PrescriptionTemplatesService', () => {
  it('lists the doctor\'s own templates mapped to the wire shape', async () => {
    const { service } = makeService();
    const out = await service.list('doc');
    expect(out[0]).toMatchObject({ id: 't1', name: 'Viral URI', followUpDays: 5 });
    expect(out[0].items).toHaveLength(1);
    expect(out[0].symptoms).toBeUndefined();
  });

  it('stamps the doctor id on create and nulls empty clinical fields', async () => {
    const { service, values } = makeService();
    await service.create('doc', { ...body, advice: undefined });
    const inserted = values.mock.calls[0][0] as Record<string, unknown>;
    expect(inserted.doctorId).toBe('doc');
    expect(inserted.advice).toBeNull();
    expect(inserted.followUpDays).toBe(5);
  });

  it('404s when updating a template that does not exist', async () => {
    const { service } = makeService({ owner: null });
    await expect(service.update('doc', 't1', body)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids updating or deleting another doctor\'s template', async () => {
    const { service } = makeService({ owner: { doctorId: 'someone-else' } });
    await expect(service.update('doc', 't1', body)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.remove('doc', 't1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes the doctor\'s own template', async () => {
    const { service, del } = makeService({ owner: { doctorId: 'doc' } });
    await service.remove('doc', 't1');
    expect(del).toHaveBeenCalledOnce();
  });
});
