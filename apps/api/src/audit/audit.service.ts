import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { auditLogs } from '../db/schema';

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Append-only record of who changed what (PLAN §13). No request bodies, no PHI —
 * just method + route + the entity touched. Writes are best-effort: auditing
 * must never break the request it is recording.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DB) private readonly db: Database) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent ?? null,
      });
    } catch (err) {
      this.logger.warn(`audit write failed: ${(err as Error).message}`);
    }
  }
}
