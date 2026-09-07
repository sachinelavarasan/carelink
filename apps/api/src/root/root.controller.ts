import { Controller, Get, Header, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { renderStatusPage, type ServerStatus } from './status-page';

@Controller()
export class RootController {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Root `/` — human-readable server status rendered as a card. */
  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async index(): Promise<string> {
    return renderStatusPage(await this.status());
  }

  private async status(): Promise<ServerStatus> {
    let database: 'up' | 'down' = 'down';
    try {
      await this.db.execute(sql`select 1`);
      database = 'up';
    } catch {
      database = 'down';
    }

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      environment: process.env.NODE_ENV ?? 'development',
      uptimeSeconds: process.uptime(),
      node: process.version,
      time: new Date().toISOString(),
    };
  }
}
