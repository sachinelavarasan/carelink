import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { authTokens } from '../db/schema';

export type AuthTokenKind = 'EMAIL_VERIFY' | 'PASSWORD_RESET' | 'REFRESH';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class TokenService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Creates a token row and returns the raw (unhashed) token to hand to the client. */
  async issue(userId: string, kind: AuthTokenKind, ttlMs: number): Promise<string> {
    const raw = randomBytes(32).toString('hex');
    await this.db.insert(authTokens).values({
      userId,
      kind,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    });
    return raw;
  }

  /**
   * Marks a matching, unconsumed, unexpired token as consumed and returns its
   * userId — or null if nothing valid matched.
   */
  async consume(raw: string, kind: AuthTokenKind): Promise<string | null> {
    const hash = sha256(raw);
    const [row] = await this.db
      .select({ id: authTokens.id, userId: authTokens.userId, expiresAt: authTokens.expiresAt })
      .from(authTokens)
      .where(and(eq(authTokens.tokenHash, hash), eq(authTokens.kind, kind), isNull(authTokens.consumedAt)))
      .limit(1);

    if (!row || row.expiresAt.getTime() < Date.now()) return null;

    await this.db
      .update(authTokens)
      .set({ consumedAt: new Date() })
      .where(eq(authTokens.id, row.id));
    return row.userId;
  }

  /** Invalidates every outstanding token of a kind for a user (e.g. all refresh tokens on password reset). */
  async revokeAll(userId: string, kind: AuthTokenKind): Promise<void> {
    await this.db
      .update(authTokens)
      .set({ consumedAt: new Date() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.consumedAt)));
  }
}
