import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { patientDataExportSchema } from '@carelink/shared';
import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import type { StorageService } from '../storage/storage.service';
import { UsersService } from './users.service';

const storageStub = {
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
} as unknown as StorageService;

const passwordHash = bcrypt.hashSync('correct-horse', 4);

function makeService(user: { id: string; passwordHash: string } | null) {
  const del = vi.fn(() => ({ where: () => Promise.resolve(undefined) }));
  const tx = { delete: del };
  const db = {
    query: { users: { findFirst: vi.fn().mockResolvedValue(user) } },
    transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as Database;
  return { service: new UsersService({ db } as unknown as Database, storageStub), del };
}

describe('UsersService.deleteAccount', () => {
  it('404s when the user is gone', async () => {
    const { service } = makeService(null);
    await expect(service.deleteAccount('u1', 'x')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an incorrect password', async () => {
    const { service, del } = makeService({ id: 'u1', passwordHash });
    await expect(service.deleteAccount('u1', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(del).not.toHaveBeenCalled();
  });

  it('hard-deletes referencing rows then the user', async () => {
    const { service, del } = makeService({ id: 'u1', passwordHash });
    const res = await service.deleteAccount('u1', 'correct-horse');
    expect(res).toEqual({ ok: true });
    // messages, prescriptions, appointments, medical_documents, users
    expect(del).toHaveBeenCalledTimes(5);
  });
});

/** Chainable, awaitable stand-in for a Drizzle select builder. */
function chain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) c[m] = () => c;
  c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej);
  return c;
}

function makeExportService(
  over: {
    user?: Record<string, unknown> | null;
    profile?: Record<string, unknown>;
    appts?: unknown[];
    rxs?: unknown[];
    msgs?: unknown[];
    docs?: unknown[];
  } = {},
) {
  const user =
    over.user === undefined
      ? {
          id: 'u1',
          email: 'p@example.com',
          fullName: 'Pat Patient',
          phone: null,
          role: 'PATIENT',
          emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
          avatarUrl: null,
          createdAt: new Date('2026-01-01T00:00:00Z'),
        }
      : over.user;

  // select() is called in Promise.all order: appointments, messages, documents.
  const select = vi
    .fn()
    .mockReturnValueOnce(chain(over.appts ?? []))
    .mockReturnValueOnce(chain(over.msgs ?? []))
    .mockReturnValueOnce(chain(over.docs ?? []));

  const db = {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(user) },
      patientProfiles: { findFirst: vi.fn().mockResolvedValue(over.profile) },
      prescriptions: { findMany: vi.fn().mockResolvedValue(over.rxs ?? []) },
    },
    select,
  };

  return new UsersService({ db } as unknown as Database, storageStub);
}

function makeAccountService(
  userRow: Record<string, unknown> | null,
  opts: { updated?: unknown[] } = {},
) {
  const returning = vi.fn().mockResolvedValue(opts.updated ?? [{ id: 'u1' }]);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  const update = vi.fn().mockReturnValue({ set });
  const db = {
    query: {
      users: { findFirst: vi.fn().mockResolvedValue(userRow) },
      patientProfiles: { findFirst: vi.fn().mockResolvedValue(undefined) },
      doctorProfiles: { findFirst: vi.fn().mockResolvedValue(undefined) },
    },
    update,
  };
  return { service: new UsersService({ db } as unknown as Database, storageStub), set };
}

describe('UsersService.updateAccount', () => {
  const userRow = {
    id: 'u1',
    role: 'PATIENT',
    email: 'p@example.com',
    phone: null,
    fullName: 'Old Name',
    avatarUrl: null,
    emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  };

  it('writes name + phone (bumping updatedAt) and returns a fresh Me', async () => {
    const { service, set } = makeAccountService({ ...userRow });
    const me = await service.updateAccount('u1', { fullName: 'New Name', phone: '9876543210' });
    const written = set.mock.calls[0][0] as Record<string, unknown>;
    expect(written).toMatchObject({ fullName: 'New Name', phone: '9876543210' });
    expect(written.updatedAt).toBeInstanceOf(Date);
    expect(me.user.email).toBe('p@example.com');
    expect(typeof me.user.updatedAt).toBe('string');
  });

  it('clears the phone when omitted', async () => {
    const { service, set } = makeAccountService({ ...userRow });
    await service.updateAccount('u1', { fullName: 'New Name' });
    expect((set.mock.calls[0][0] as Record<string, unknown>).phone).toBeNull();
  });

  it('404s when the user is gone', async () => {
    const { service } = makeAccountService(null, { updated: [] });
    await expect(
      service.updateAccount('u1', { fullName: 'New Name' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('UsersService.exportPatientData', () => {
  it('404s when the user is gone', async () => {
    const svc = makeExportService({ user: null });
    await expect(svc.exportPatientData('u1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('assembles a schema-valid bundle, orders Rx items, and omits doctor notes', async () => {
    const svc = makeExportService({
      appts: [
        {
          appt: {
            id: 'a1',
            patientId: 'u1',
            doctorId: 'd1',
            scheduledStart: new Date('2026-02-01T09:00:00Z'),
            scheduledEnd: new Date('2026-02-01T09:15:00Z'),
            status: 'COMPLETED',
            reasonForVisit: 'cough',
            consentAcceptedAt: new Date('2026-01-30T00:00:00Z'),
            identityVerifiedAt: null,
            cancelledBy: null,
            cancelReason: null,
            createdAt: new Date('2026-01-30T00:00:00Z'),
          },
          doctorName: 'Dr. Who',
        },
      ],
      rxs: [
        {
          id: 'rx1',
          appointmentId: 'a1',
          issuedAt: new Date('2026-02-01T09:20:00Z'),
          finalizedAt: new Date('2026-02-01T09:25:00Z'),
          symptoms: null,
          diagnosis: 'viral URI',
          advice: 'rest',
          notes: 'seen-alone-secret',
          followUpDate: '2026-02-15',
          drugCategoryFlags: ['OTC'],
          items: [
            { id: 'i2', position: 1, drugName: 'Bravo', strength: null, form: null, frequency: 'od', durationDays: 3, instructions: null },
            { id: 'i1', position: 0, drugName: 'Alpha', strength: '500mg', form: 'tab', frequency: 'bd', durationDays: 5, instructions: 'after food' },
          ],
        },
      ],
      msgs: [
        { id: 'm1', threadId: 't1', senderId: 'u1', body: 'hi doc', attachmentKey: null, sentAt: new Date('2026-02-01T09:05:00Z'), readAt: null },
      ],
      docs: [{ id: 'doc1', kind: 'LAB_REPORT', title: 'CBC', uploadedAt: new Date('2026-01-15T00:00:00Z') }],
    });

    const out = await svc.exportPatientData('u1');

    expect(out.user.emailVerified).toBe(true);
    expect(out.patientProfile).toBeNull();
    expect(out.appointments[0]).toMatchObject({ id: 'a1', doctorName: 'Dr. Who', status: 'COMPLETED' });
    expect(out.prescriptions[0].items.map((i) => i.drugName)).toEqual(['Alpha', 'Bravo']);
    expect(out.messages[0].body).toBe('hi doc');
    expect(out.documents[0].title).toBe('CBC');
    expect(JSON.stringify(out)).not.toContain('seen-alone-secret');
    expect(patientDataExportSchema.safeParse(out).success).toBe(true);
  });
});
