import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { CsrfGuard } from './csrf.guard';

function ctx(req: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as Parameters<CsrfGuard['canActivate']>[0];
}

const guard = new CsrfGuard();

describe('CsrfGuard', () => {
  it('allows safe methods', () => {
    expect(guard.canActivate(ctx({ method: 'GET', headers: {}, cookies: {} }))).toBe(true);
  });

  it('allows Bearer-authenticated requests (mobile)', () => {
    expect(
      guard.canActivate(
        ctx({ method: 'POST', headers: { authorization: 'Bearer x' }, cookies: { carelink_access: 'a' } }),
      ),
    ).toBe(true);
  });

  it('allows cookie-less mutations (e.g. login)', () => {
    expect(guard.canActivate(ctx({ method: 'POST', headers: {}, cookies: {} }))).toBe(true);
  });

  it('rejects a cookie session mutation with no CSRF header', () => {
    expect(() =>
      guard.canActivate(
        ctx({ method: 'POST', headers: {}, cookies: { carelink_access: 'a', carelink_csrf: 'tok' } }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects a mismatched CSRF header', () => {
    expect(() =>
      guard.canActivate(
        ctx({
          method: 'POST',
          headers: { 'x-csrf-token': 'nope' },
          cookies: { carelink_refresh: 'r', carelink_csrf: 'tok' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('accepts a matching CSRF header', () => {
    expect(
      guard.canActivate(
        ctx({
          method: 'POST',
          headers: { 'x-csrf-token': 'tok' },
          cookies: { carelink_access: 'a', carelink_csrf: 'tok' },
        }),
      ),
    ).toBe(true);
  });
});
