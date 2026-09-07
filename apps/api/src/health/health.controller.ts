import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';

@Controller('healthz')
export class HealthController {
  private get db() {
    return this.connection.db;
  }

  constructor(@Inject(DB) private readonly connection: Database) {}

  @Get()
  async check(): Promise<{ status: string; db: 'up' | 'down'; time: string }> {
    let db: 'up' | 'down' = 'down';
    try {
      await this.db.execute(sql`select 1`);
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }
}
