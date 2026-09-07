import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gt, gte, lt, or, type SQL } from 'drizzle-orm';
import type {
  Appointment,
  AppointmentListItem,
  AppointmentPage,
  AppointmentSummary,
  CreateAppointmentInput,
  ListAppointmentsQuery,
} from '@carelink/shared';
import { AvailabilityService } from '../availability/availability.service';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { appointments, chatThreads, users } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../common/current-user.decorator';

const CANCELLABLE = new Set(['CONFIRMED', 'REQUESTED']);
const CHAT_OPEN_AFTER_MS = 7 * 86_400_000;
const MIN = 60_000;

@Injectable()
export class AppointmentsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async book(patientId: string, input: CreateAppointmentInput): Promise<Appointment> {
    if (input.doctorId === patientId) {
      throw new BadRequestException('cannot book yourself');
    }
    const slot = await this.availability.findFreeSlot(input.doctorId, input.scheduledStart);
    if (!slot) throw new BadRequestException('that slot is no longer available');

    const start = new Date(slot.start);
    const end = new Date(slot.end);

    const appointment = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(appointments)
        .values({
          patientId,
          doctorId: input.doctorId,
          scheduledStart: start,
          scheduledEnd: end,
          status: 'CONFIRMED',
          reasonForVisit: input.reasonForVisit,
          consentAcceptedAt: new Date(),
        })
        .returning();

      await tx.insert(chatThreads).values({
        appointmentId: row.id,
        opensAt: start,
        closesAt: new Date(end.getTime() + CHAT_OPEN_AFTER_MS),
      });
      return row;
    });

    await this.scheduleReminders(appointment.id, patientId, input.doctorId, start, 'confirmed');
    return toAppointment(appointment);
  }

  async list(user: AuthUser, query: ListAppointmentsQuery): Promise<AppointmentPage> {
    const now = new Date();
    const mine = or(eq(appointments.patientId, user.id), eq(appointments.doctorId, user.id));

    const scopeClause: SQL | undefined =
      query.scope === 'upcoming'
        ? and(gte(appointments.scheduledEnd, now), eq(appointments.status, 'CONFIRMED'))
        : query.scope === 'past'
          ? or(lt(appointments.scheduledEnd, now), eq(appointments.status, 'CANCELLED'))
          : undefined;

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const ascending = query.scope === 'upcoming';
    const cursorClause: SQL | undefined = cursor
      ? ascending
        ? or(
            gt(appointments.scheduledStart, cursor.start),
            and(eq(appointments.scheduledStart, cursor.start), gt(appointments.id, cursor.id)),
          )
        : or(
            lt(appointments.scheduledStart, cursor.start),
            and(eq(appointments.scheduledStart, cursor.start), lt(appointments.id, cursor.id)),
          )
      : undefined;

    const where = and(
      mine,
      scopeClause,
      query.status ? eq(appointments.status, query.status) : undefined,
      cursorClause,
    );

    const rows = await this.db
      .select()
      .from(appointments)
      .where(where)
      .orderBy(
        ascending ? appointments.scheduledStart : desc(appointments.scheduledStart),
        ascending ? appointments.id : desc(appointments.id),
      )
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1].scheduledStart, page[page.length - 1].id)
        : null;

    const items = await Promise.all(page.map((row) => this.toListItem(row, user.id)));
    return { items, nextCursor };
  }

  async get(user: AuthUser, id: string): Promise<Appointment> {
    const row = await this.requireParticipant(user, id);
    return toAppointment(row);
  }

  async cancel(user: AuthUser, id: string, reason: string): Promise<Appointment> {
    const row = await this.requireParticipant(user, id);
    if (!CANCELLABLE.has(row.status)) {
      throw new BadRequestException(`cannot cancel a ${row.status.toLowerCase()} appointment`);
    }
    const [updated] = await this.db
      .update(appointments)
      .set({ status: 'CANCELLED', cancelledBy: user.id, cancelReason: reason })
      .where(eq(appointments.id, id))
      .returning();

    await this.notifications.cancelUnsentForAppointment(id);
    const other = user.id === row.patientId ? row.doctorId : row.patientId;
    await this.notifications.enqueueMany([
      {
        userId: other,
        kind: 'appointment_cancelled',
        channel: 'EMAIL',
        scheduledFor: new Date(),
        payload: { appointmentId: id, scheduledStart: row.scheduledStart.toISOString() },
      },
    ]);
    return toAppointment(updated);
  }

  async reschedule(user: AuthUser, id: string, newStartIso: string): Promise<Appointment> {
    const row = await this.requireParticipant(user, id);
    if (!CANCELLABLE.has(row.status)) {
      throw new BadRequestException(`cannot reschedule a ${row.status.toLowerCase()} appointment`);
    }
    const slot = await this.availability.findFreeSlot(row.doctorId, newStartIso, id);
    if (!slot) throw new BadRequestException('that slot is no longer available');

    const start = new Date(slot.start);
    const end = new Date(slot.end);

    const updated = await this.db.transaction(async (tx) => {
      const [appt] = await tx
        .update(appointments)
        .set({ scheduledStart: start, scheduledEnd: end })
        .where(eq(appointments.id, id))
        .returning();
      await tx
        .update(chatThreads)
        .set({ opensAt: start, closesAt: new Date(end.getTime() + CHAT_OPEN_AFTER_MS) })
        .where(eq(chatThreads.appointmentId, id));
      return appt;
    });

    await this.notifications.cancelUnsentForAppointment(id);
    await this.scheduleReminders(id, row.patientId, row.doctorId, start, 'none');
    return toAppointment(updated);
  }

  async verifyIdentity(user: AuthUser, id: string): Promise<Appointment> {
    const row = await this.requireParticipant(user, id);
    if (user.id !== row.doctorId) throw new ForbiddenException('only the doctor can verify identity');
    const [updated] = await this.db
      .update(appointments)
      .set({ identityVerifiedAt: new Date() })
      .where(eq(appointments.id, id))
      .returning();
    return toAppointment(updated);
  }

  /** Home-page summary: 3 counts, a 14-day daily series, and a lifetime status
   *  breakdown + distinct-patients count for the doctor dashboard. */
  async summary(user: AuthUser): Promise<AppointmentSummary> {
    const rows = await this.db
      .select({
        status: appointments.status,
        start: appointments.scheduledStart,
        end: appointments.scheduledEnd,
        patientId: appointments.patientId,
      })
      .from(appointments)
      .where(or(eq(appointments.patientId, user.id), eq(appointments.doctorId, user.id)));

    const now = Date.now();
    const in7 = now + 7 * 86_400_000;
    let upcoming = 0;
    let next7Days = 0;
    let completed = 0;
    const byStatus: AppointmentSummary['byStatus'] = {
      REQUESTED: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
      NO_SHOW: 0,
    };
    const seen = new Set<string>();

    for (const r of rows) {
      byStatus[r.status] += 1;
      if (r.status === 'COMPLETED') {
        completed += 1;
        seen.add(r.patientId);
      }
      if (r.status === 'CONFIRMED' && r.end.getTime() >= now) {
        upcoming += 1;
        if (r.start.getTime() >= now && r.start.getTime() < in7) next7Days += 1;
      }
    }

    // 14 ordered buckets ending today, keyed by clinic-local date.
    const daily = new Map<string, number>();
    const today = clinicDate(new Date());
    for (let i = 13; i >= 0; i -= 1) daily.set(shiftDate(today, -i), 0);
    for (const r of rows) {
      if (r.status === 'CANCELLED') continue;
      const key = clinicDate(r.start);
      if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + 1);
    }

    return {
      upcoming,
      next7Days,
      completed,
      daily: [...daily].map(([date, count]) => ({ date, count })),
      byStatus,
      patientsSeen: seen.size,
    };
  }

  /* ---------------------------------------------------------------- helpers */

  private async requireParticipant(user: AuthUser, id: string): Promise<typeof appointments.$inferSelect> {
    const row = await this.db.query.appointments.findFirst({ where: eq(appointments.id, id) });
    if (!row) throw new NotFoundException('appointment not found');
    if (row.patientId !== user.id && row.doctorId !== user.id) {
      throw new ForbiddenException('not your appointment');
    }
    return row;
  }

  private async scheduleReminders(
    appointmentId: string,
    patientId: string,
    doctorId: string,
    start: Date,
    confirmation: 'confirmed' | 'none',
  ): Promise<void> {
    const payload = { appointmentId, scheduledStart: start.toISOString() };
    const now = Date.now();
    const jobs = [];

    if (confirmation === 'confirmed') {
      jobs.push({
        userId: patientId,
        kind: 'appointment_confirmed',
        channel: 'EMAIL' as const,
        scheduledFor: new Date(),
        payload,
      });
    }
    const at24h = new Date(start.getTime() - 24 * 60 * MIN);
    const at1h = new Date(start.getTime() - 60 * MIN);
    if (at24h.getTime() > now) {
      jobs.push({ userId: patientId, kind: 'appointment_reminder_24h', channel: 'PUSH' as const, scheduledFor: at24h, payload });
    }
    if (at1h.getTime() > now) {
      jobs.push({ userId: patientId, kind: 'appointment_reminder_1h', channel: 'PUSH' as const, scheduledFor: at1h, payload });
      jobs.push({ userId: doctorId, kind: 'appointment_reminder_1h', channel: 'PUSH' as const, scheduledFor: at1h, payload });
    }
    await this.notifications.enqueueMany(jobs);
  }

  private async toListItem(
    row: typeof appointments.$inferSelect,
    viewerId: string,
  ): Promise<AppointmentListItem> {
    const otherId = row.patientId === viewerId ? row.doctorId : row.patientId;
    const [other, thread] = await Promise.all([
      this.db.query.users.findFirst({ where: eq(users.id, otherId), columns: { fullName: true } }),
      this.db.query.chatThreads.findFirst({
        where: eq(chatThreads.appointmentId, row.id),
        columns: { id: true },
      }),
    ]);
    return {
      ...toAppointment(row),
      counterpartyName: other?.fullName ?? 'Unknown',
      chatThreadId: thread?.id ?? null,
    };
  }
}

function toAppointment(row: typeof appointments.$inferSelect): Appointment {
  return {
    id: row.id,
    patientId: row.patientId,
    doctorId: row.doctorId,
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    status: row.status,
    reasonForVisit: row.reasonForVisit,
    consentAcceptedAt: row.consentAcceptedAt ? row.consentAcceptedAt.toISOString() : null,
    identityVerifiedAt: row.identityVerifiedAt ? row.identityVerifiedAt.toISOString() : null,
    cancelledBy: row.cancelledBy ?? null,
    cancelReason: row.cancelReason ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

interface Cursor {
  start: Date;
  id: string;
}
/** Date part of an instant in the clinic timezone (IST, +05:30, no DST). */
function clinicDate(d: Date): string {
  return new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function encodeCursor(start: Date, id: string): string {
  return Buffer.from(`${start.toISOString()}|${id}`).toString('base64url');
}
function decodeCursor(raw: string): Cursor {
  const [iso, id] = Buffer.from(raw, 'base64url').toString().split('|');
  return { start: new Date(iso), id };
}
