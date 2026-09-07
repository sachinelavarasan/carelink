import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull, lte } from 'drizzle-orm';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { notifications, pushTokens, users } from '../db/schema';
import { MailService } from '../mail/mail.service';

type NotificationChannel = 'PUSH' | 'EMAIL';

interface EnqueueInput {
  userId: string;
  kind: string;
  channel: NotificationChannel;
  scheduledFor: Date;
  payload: Record<string, unknown>;
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly mail: MailService,
  ) {}

  async registerPushToken(userId: string, token: string, platform: string): Promise<void> {
    await this.db
      .insert(pushTokens)
      .values({ userId, token, platform })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform } });
  }

  enqueueMany(inputs: EnqueueInput[]): Promise<unknown> {
    if (inputs.length === 0) return Promise.resolve();
    return this.db.insert(notifications).values(
      inputs.map((i) => ({
        userId: i.userId,
        kind: i.kind,
        channel: i.channel,
        scheduledFor: i.scheduledFor,
        payloadJson: i.payload,
      })),
    );
  }

  /** Removes unsent notifications tied to an appointment (on cancel/reschedule). */
  async cancelUnsentForAppointment(appointmentId: string): Promise<void> {
    const rows = await this.db
      .select({ id: notifications.id, payloadJson: notifications.payloadJson })
      .from(notifications)
      .where(isNull(notifications.sentAt));
    const ids = rows
      .filter((r) => (r.payloadJson as { appointmentId?: string }).appointmentId === appointmentId)
      .map((r) => r.id);
    for (const id of ids) {
      await this.db.delete(notifications).where(eq(notifications.id, id));
    }
  }

  /** Sends every notification whose scheduledFor has passed. Returns the count. */
  async dispatchDue(now = new Date()): Promise<number> {
    const due = await this.db
      .select()
      .from(notifications)
      .where(and(isNull(notifications.sentAt), lte(notifications.scheduledFor, now)))
      .limit(200);

    for (const n of due) {
      try {
        if (n.channel === 'PUSH') {
          await this.sendPush(n.userId, n.kind, n.payloadJson as Record<string, unknown>);
        } else {
          await this.sendEmail(n.userId, n.kind, n.payloadJson as Record<string, unknown>);
        }
      } catch (err) {
        this.logger.warn(`notification ${n.id} (${n.kind}) failed: ${(err as Error).message}`);
      }
      await this.db.update(notifications).set({ sentAt: new Date() }).where(eq(notifications.id, n.id));
    }
    return due.length;
  }

  private describe(kind: string, payload: Record<string, unknown>): { title: string; body: string } {
    const when = payload.scheduledStart
      ? new Date(String(payload.scheduledStart)).toLocaleString('en-IN')
      : '';
    switch (kind) {
      case 'appointment_confirmed':
        return { title: 'Appointment confirmed', body: `Your consultation is booked for ${when}.` };
      case 'appointment_reminder_24h':
        return { title: 'Consultation tomorrow', body: `Reminder: your consultation is at ${when}.` };
      case 'appointment_reminder_1h':
        return { title: 'Consultation soon', body: `Your consultation starts at ${when}.` };
      case 'appointment_cancelled':
        return { title: 'Appointment cancelled', body: `The consultation for ${when} was cancelled.` };
      case 'chat_message':
        // No PHI in push bodies (PLAN §13).
        return { title: 'New message', body: 'You have a new message in your consultation.' };
      case 'prescription_ready':
        return {
          title: 'Prescription ready',
          body: 'Your doctor has issued a prescription. Log in to view and download it.',
        };
      case 'video_started':
        return {
          title: 'Video call started',
          body: 'Your doctor has started the video consultation. Join now.',
        };
      default:
        return { title: 'CareLink', body: 'You have an update.' };
    }
  }

  private async sendPush(userId: string, kind: string, payload: Record<string, unknown>): Promise<void> {
    const tokens = await this.db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));
    if (tokens.length === 0) return;

    const { title, body } = this.describe(kind, payload);
    const messages = tokens.map((t) => ({ to: t.token, title, body, data: { kind, ...payload } }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!res.ok) throw new Error(`expo push ${res.status}`);
  }

  private async sendEmail(userId: string, kind: string, payload: Record<string, unknown>): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    });
    if (!user) return;
    const { title, body } = this.describe(kind, payload);
    await this.mail.sendGeneric(user.email, `CareLink — ${title}`, `${body}\n\nLog in to view details.`);
  }
}
