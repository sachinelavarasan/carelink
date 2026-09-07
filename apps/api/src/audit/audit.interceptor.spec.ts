import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuditInterceptor } from './audit.interceptor';
import type { AuditService } from './audit.service';

function makeCtx(req: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const handler: CallHandler = { handle: () => of({ ok: true }) };

function setup() {
  const record = vi.fn().mockResolvedValue(undefined);
  const interceptor = new AuditInterceptor({ record } as unknown as AuditService);
  return { interceptor, record };
}

describe('AuditInterceptor', () => {
  it('records one row for a successful mutating request', async () => {
    const { interceptor, record } = setup();
    const req = {
      method: 'POST',
      url: '/api/v1/prescriptions/rx1/finalize',
      route: { path: '/api/v1/prescriptions/:id/finalize' },
      params: { id: 'rx1' },
      ip: '10.0.0.9',
      headers: { 'user-agent': 'vitest' },
      user: { id: 'doc1', role: 'DOCTOR' },
    };

    await lastValueFrom(interceptor.intercept(makeCtx(req), handler));

    expect(record).toHaveBeenCalledWith({
      actorUserId: 'doc1',
      action: 'POST /api/v1/prescriptions/:id/finalize',
      entityType: 'prescriptions',
      entityId: 'rx1',
      ip: '10.0.0.9',
      userAgent: 'vitest',
    });
  });

  it('ignores non-mutating methods', async () => {
    const { interceptor, record } = setup();
    const req = { method: 'GET', url: '/api/v1/appointments', route: { path: '/api/v1/appointments' }, headers: {} };
    await lastValueFrom(interceptor.intercept(makeCtx(req), handler));
    expect(record).not.toHaveBeenCalled();
  });

  it('skips the refresh route', async () => {
    const { interceptor, record } = setup();
    const req = {
      method: 'POST',
      url: '/api/v1/auth/refresh',
      route: { path: '/api/v1/auth/refresh' },
      headers: {},
    };
    await lastValueFrom(interceptor.intercept(makeCtx(req), handler));
    expect(record).not.toHaveBeenCalled();
  });

  it('takes the first hop from x-forwarded-for and tolerates no auth user', async () => {
    const { interceptor, record } = setup();
    const req = {
      method: 'DELETE',
      url: '/api/v1/me/availability/exceptions/e1?x=1',
      route: { path: '/api/v1/me/availability/exceptions/:id' },
      params: { id: 'e1' },
      headers: { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' },
    };
    await lastValueFrom(interceptor.intercept(makeCtx(req), handler));
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, entityId: 'e1', ip: '203.0.113.5' }),
    );
  });

  it('does not fail the request when the audit write rejects', async () => {
    const { interceptor, record } = setup();
    record.mockRejectedValueOnce(new Error('db down'));
    const req = {
      method: 'POST',
      url: '/api/v1/messages',
      route: { path: '/api/v1/messages' },
      params: {},
      headers: {},
    };
    const result = await lastValueFrom(interceptor.intercept(makeCtx(req), handler));
    expect(result).toEqual({ ok: true });
  });
});
