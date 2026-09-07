import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gt, isNull, ne, or } from 'drizzle-orm';
import type {
  Message,
  MessagesPage,
  SendMessageInput,
  ThreadMessagesQuery,
  ThreadState,
  ThreadView,
} from '@carelink/shared';
import type { AuthUser } from '../common/current-user.decorator';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { appointments, chatThreads, messages, users } from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';

type ThreadRow = typeof chatThreads.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;

/** PENDING before opensAt · OPEN inside the window · CLOSED after closesAt. */
export function threadState(
  thread: { opensAt: Date; closesAt: Date },
  now: Date = new Date(),
): ThreadState {
  if (now < thread.opensAt) return 'PENDING';
  if (now > thread.closesAt) return 'CLOSED';
  return 'OPEN';
}

@Injectable()
export class ChatService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly notifications: NotificationsService,
  ) {}

  /** Header data for the consult page, resolved from the appointment id. */
  async threadForAppointment(user: AuthUser, appointmentId: string): Promise<ThreadView> {
    const appt = await this.db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });
    if (!appt) throw new NotFoundException('appointment not found');
    this.assertParticipant(user, appt);

    const thread = await this.db.query.chatThreads.findFirst({
      where: eq(chatThreads.appointmentId, appointmentId),
    });
    if (!thread) throw new NotFoundException('no consultation thread for this appointment');

    return this.toThreadView(user, thread, appt);
  }

  /** Ascending message history. Reading also marks the other party's messages read. */
  async history(
    user: AuthUser,
    threadId: string,
    query: ThreadMessagesQuery,
  ): Promise<MessagesPage> {
    await this.requireParticipant(user, threadId);

    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.threadId, threadId),
          cursor
            ? or(
                gt(messages.sentAt, cursor.sentAt),
                and(eq(messages.sentAt, cursor.sentAt), gt(messages.id, cursor.id)),
              )
            : undefined,
        ),
      )
      .orderBy(asc(messages.sentAt), asc(messages.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit);
    const nextCursor =
      rows.length > query.limit
        ? encodeCursor(page[page.length - 1].sentAt, page[page.length - 1].id)
        : null;

    await this.db
      .update(messages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(messages.threadId, threadId),
          ne(messages.senderId, user.id),
          isNull(messages.readAt),
        ),
      );

    return { items: page.map(toMessage), nextCursor };
  }

  async send(user: AuthUser, input: SendMessageInput): Promise<Message> {
    const { thread, appt } = await this.requireParticipant(user, input.threadId);

    const state = threadState(thread);
    if (state === 'PENDING') throw new BadRequestException('the consultation has not opened yet');
    if (state === 'CLOSED') throw new BadRequestException('the consultation window has closed');

    const [row] = await this.db
      .insert(messages)
      .values({
        threadId: thread.id,
        senderId: user.id,
        body: input.body,
        attachmentKey: input.attachmentKey ?? null,
      })
      .returning();

    const otherId = user.id === appt.patientId ? appt.doctorId : appt.patientId;
    await this.notifications.enqueueMany([
      {
        userId: otherId,
        kind: 'chat_message',
        channel: 'PUSH',
        scheduledFor: new Date(),
        payload: { appointmentId: appt.id, threadId: thread.id },
      },
    ]);

    return toMessage(row);
  }

  /* ---------------------------------------------------------------- helpers */

  private async requireParticipant(
    user: AuthUser,
    threadId: string,
  ): Promise<{ thread: ThreadRow; appt: AppointmentRow }> {
    const thread = await this.db.query.chatThreads.findFirst({
      where: eq(chatThreads.id, threadId),
    });
    if (!thread) throw new NotFoundException('thread not found');
    const appt = await this.db.query.appointments.findFirst({
      where: eq(appointments.id, thread.appointmentId),
    });
    if (!appt) throw new NotFoundException('appointment not found');
    this.assertParticipant(user, appt);
    return { thread, appt };
  }

  private assertParticipant(user: AuthUser, appt: AppointmentRow): void {
    if (appt.patientId !== user.id && appt.doctorId !== user.id) {
      throw new ForbiddenException('not your consultation');
    }
  }

  private async toThreadView(
    user: AuthUser,
    thread: ThreadRow,
    appt: AppointmentRow,
  ): Promise<ThreadView> {
    const viewerRole = user.id === appt.doctorId ? 'DOCTOR' : 'PATIENT';
    const otherId = viewerRole === 'DOCTOR' ? appt.patientId : appt.doctorId;
    const other = await this.db.query.users.findFirst({
      where: eq(users.id, otherId),
      columns: { fullName: true },
    });
    return {
      id: thread.id,
      appointmentId: appt.id,
      opensAt: thread.opensAt.toISOString(),
      closesAt: thread.closesAt.toISOString(),
      state: threadState(thread),
      viewerRole,
      counterpartyId: otherId,
      counterpartyName: other?.fullName ?? 'Unknown',
      reasonForVisit: appt.reasonForVisit,
      consentAcceptedAt: appt.consentAcceptedAt ? appt.consentAcceptedAt.toISOString() : null,
      identityVerifiedAt: appt.identityVerifiedAt ? appt.identityVerifiedAt.toISOString() : null,
    };
  }
}

function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    senderId: row.senderId,
    body: row.body,
    attachmentKey: row.attachmentKey ?? null,
    sentAt: row.sentAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

interface MessageCursor {
  sentAt: Date;
  id: string;
}
function encodeCursor(sentAt: Date, id: string): string {
  return Buffer.from(`${sentAt.toISOString()}|${id}`).toString('base64url');
}
function decodeCursor(raw: string): MessageCursor {
  const [iso, id] = Buffer.from(raw, 'base64url').toString().split('|');
  return { sentAt: new Date(iso), id };
}
