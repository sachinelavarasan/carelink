import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import { AuditService } from './audit.service';

describe('AuditService.record', () => {
  it('maps the entry onto an audit_logs insert', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const db = { insert: () => ({ values }) } as unknown as Database;
    const service = new AuditService({ db } as unknown as Database);

    await service.record({
      actorUserId: 'u1',
      action: 'POST /api/v1/messages',
      entityType: 'messages',
      entityId: '-',
    });

    expect(values).toHaveBeenCalledWith({
      actorUserId: 'u1',
      action: 'POST /api/v1/messages',
      entityType: 'messages',
      entityId: '-',
      ip: null,
      userAgent: null,
    });
  });

  it('swallows a database error', async () => {
    const db = {
      insert: () => ({
        values: () => {
          throw new Error('connection refused');
        },
      }),
    } as unknown as Database;
    const service = new AuditService({ db } as unknown as Database);
    await expect(
      service.record({ action: 'x', entityType: 'y', entityId: 'z' }),
    ).resolves.toBeUndefined();
  });
});
