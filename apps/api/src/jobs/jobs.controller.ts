import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { NotificationsService } from '../notifications/notifications.service';
import { CronGuard } from './cron.guard';

@Controller('jobs')
@UseGuards(CronGuard)
export class JobsController {
  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly notifications: NotificationsService,
  ) {}

  /** Called by the GitHub Actions cron every 5 min. */
  @Post('run')
  @HttpCode(200)
  async run(): Promise<{ dispatched: number; keepAlive: boolean }> {
    const dispatched = await this.notifications.dispatchDue();
    await this.db.execute(sql`select 1`); // keeps Supabase from pausing
    return { dispatched, keepAlive: true };
  }
}
