import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import type { VideoSession, VideoState } from '@carelink/shared';
import type { AuthUser } from '../common/current-user.decorator';
import type { AppConfig } from '../config';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { appointments, videoSessions } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';

type AppointmentRow = typeof appointments.$inferSelect;
type VideoRow = typeof videoSessions.$inferSelect;

const OPEN_BEFORE_MS = 5 * 60_000;
const CLOSE_AFTER_MS = 30 * 60_000;

@Injectable()
export class VideoService {
  private readonly domain: string;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.domain = config.get('JITSI_DOMAIN', { infer: true });
  }

  /** Reads the session, creating the room lazily on first access. */
  async getForAppointment(user: AuthUser, appointmentId: string): Promise<VideoSession> {
    const appt = await this.loadAppointment(appointmentId);
    this.assertParticipant(user, appt);
    const row = await this.ensureRow(appt);
    return this.toView(row, appt);
  }

  async start(user: AuthUser, appointmentId: string): Promise<VideoSession> {
    const appt = await this.loadAppointment(appointmentId);
    this.assertParticipant(user, appt);
    let row = await this.ensureRow(appt);

    if (!this.inWindow(appt) || appt.status !== 'CONFIRMED') {
      throw new BadRequestException('the call window is not open');
    }

    const firstStart = !row.startedAt;
    // Set startedAt once; clear any earlier endedAt so a dropped call can rejoin
    // while the window is still open.
    if (firstStart || row.endedAt) {
      [row] = await this.db
        .update(videoSessions)
        .set({ startedAt: row.startedAt ?? new Date(), endedAt: null })
        .where(eq(videoSessions.id, row.id))
        .returning();
    }

    if (firstStart && user.id === appt.doctorId) {
      await this.notifications.enqueueMany([
        {
          userId: appt.patientId,
          kind: 'video_started',
          channel: 'PUSH',
          scheduledFor: new Date(),
          payload: { appointmentId: appt.id },
        },
      ]);
    }
    return this.toView(row, appt);
  }

  async end(user: AuthUser, appointmentId: string): Promise<VideoSession> {
    const appt = await this.loadAppointment(appointmentId);
    this.assertParticipant(user, appt);
    let row = await this.ensureRow(appt);

    if (row.startedAt && !row.endedAt) {
      [row] = await this.db
        .update(videoSessions)
        .set({ endedAt: new Date() })
        .where(eq(videoSessions.id, row.id))
        .returning();
    }
    return this.toView(row, appt);
  }

  /* ---------------------------------------------------------------- helpers */

  private async ensureRow(appt: AppointmentRow): Promise<VideoRow> {
    const existing = await this.db.query.videoSessions.findFirst({
      where: eq(videoSessions.appointmentId, appt.id),
    });
    if (existing) return existing;
    if (appt.status === 'CANCELLED') {
      throw new BadRequestException('the appointment was cancelled');
    }
    const [row] = await this.db
      .insert(videoSessions)
      .values({ appointmentId: appt.id, roomName: `carelink-${randomUUID()}` })
      .onConflictDoNothing()
      .returning();
    // If a concurrent request won the insert race, re-read.
    return (
      row ??
      (await this.db.query.videoSessions.findFirst({
        where: eq(videoSessions.appointmentId, appt.id),
      }))!
    );
  }

  private windowFor(appt: AppointmentRow): { opensAt: Date; closesAt: Date } {
    return {
      opensAt: new Date(appt.scheduledStart.getTime() - OPEN_BEFORE_MS),
      closesAt: new Date(appt.scheduledEnd.getTime() + CLOSE_AFTER_MS),
    };
  }

  private inWindow(appt: AppointmentRow, now = new Date()): boolean {
    const { opensAt, closesAt } = this.windowFor(appt);
    return now >= opensAt && now <= closesAt;
  }

  /** ENDED only once the window has closed (or the appointment is done) — an
   *  `endedAt` while the window is still open just means everyone stepped out,
   *  and the call can be rejoined. */
  private state(row: VideoRow, appt: AppointmentRow): VideoState {
    const over = !this.inWindow(appt) || appt.status === 'COMPLETED';
    if (row.endedAt && over) return 'ENDED';
    if (row.startedAt && !row.endedAt) return 'LIVE';
    return 'PENDING';
  }

  private toView(row: VideoRow, appt: AppointmentRow): VideoSession {
    const { opensAt, closesAt } = this.windowFor(appt);
    return {
      appointmentId: appt.id,
      domain: this.domain,
      roomName: row.roomName,
      joinUrl: `https://${this.domain}/${row.roomName}`,
      state: this.state(row, appt),
      canJoin: appt.status === 'CONFIRMED' && this.inWindow(appt),
      windowOpensAt: opensAt.toISOString(),
      windowClosesAt: closesAt.toISOString(),
      startedAt: row.startedAt ? row.startedAt.toISOString() : null,
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    };
  }

  private async loadAppointment(id: string): Promise<AppointmentRow> {
    const appt = await this.db.query.appointments.findFirst({ where: eq(appointments.id, id) });
    if (!appt) throw new NotFoundException('appointment not found');
    return appt;
  }

  private assertParticipant(user: AuthUser, appt: AppointmentRow): void {
    if (appt.patientId !== user.id && appt.doctorId !== user.id) {
      throw new ForbiddenException('not your consultation');
    }
  }
}
