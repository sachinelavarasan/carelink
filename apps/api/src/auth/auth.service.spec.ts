import { ForbiddenException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

type FakeUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN';
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
};

function makeService(user: FakeUser | null) {
  const mail = {
    sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  };
  const jwt = {
    signAsync: vi.fn().mockResolvedValue('signed.jwt'),
    verifyAsync: vi.fn().mockResolvedValue({ sub: 'u1', purpose: 'verify' }),
  };
  const config = {
    get: (key: string) =>
      ({
        JWT_ACCESS_SECRET: 'secret',
        JWT_ACCESS_TTL: '7d',
        APP_WEB_URL: 'http://localhost:5173',
      })[key],
  };
  const db = {
    query: { users: { findFirst: vi.fn().mockResolvedValue(user ?? undefined) } },
    insert: () => ({
      values: () => ({ returning: () => Promise.resolve([{ id: 'new-user' }]) }),
    }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = new AuthService({ db } as any, jwt as any, config as any, mail as any);
  return { service, mail, jwt };
}

const baseUser = (over: Partial<FakeUser> = {}): FakeUser => ({
  id: 'u1',
  email: 'p@example.com',
  passwordHash: bcrypt.hashSync('correct-horse', 4),
  role: 'PATIENT',
  emailVerifiedAt: new Date(),
  disabledAt: null,
  ...over,
});

describe('AuthService.login', () => {
  it('issues an access token for a verified user with the right password', async () => {
    const { service } = makeService(baseUser());
    const result = await service.login({ email: 'p@example.com', password: 'correct-horse' });
    expect(result).toEqual({ accessToken: 'signed.jwt', expiresIn: 604800 });
  });

  it('rejects a wrong password with a generic error', async () => {
    const { service } = makeService(baseUser());
    await expect(
      service.login({ email: 'p@example.com', password: 'wrong' }),
    ).rejects.toThrow(/invalid email or password/);
  });

  it('refuses login when the email is not verified', async () => {
    const { service } = makeService(baseUser({ emailVerifiedAt: null }));
    await expect(
      service.login({ email: 'p@example.com', password: 'correct-horse' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AuthService.register', () => {
  it('stays quiet and sends no email when the address already exists', async () => {
    const { service, mail } = makeService(baseUser());
    const result = await service.register({
      email: 'p@example.com',
      password: 'correct-horse',
      fullName: 'Pat Patient',
    });
    expect(result).toEqual({ ok: true });
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it('creates the user and emails a verification link for a new address', async () => {
    const { service, mail, jwt } = makeService(null);
    await service.register({
      email: 'new@example.com',
      password: 'correct-horse',
      fullName: 'New Person',
    });
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'new-user', purpose: 'verify' },
      expect.objectContaining({ expiresIn: '24h' }),
    );
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
      'new@example.com',
      expect.stringContaining('http://localhost:5173/verify?token=signed.jwt'),
    );
  });
});
