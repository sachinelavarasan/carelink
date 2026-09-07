import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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
