import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt, ne, or, type SQL } from 'drizzle-orm';
import type {
  CreatePrescriptionInput,
  MedicalHistory,
  MedicalHistoryEntry,
  PrescriptionView,
  UpdatePrescriptionInput,
} from '@carelink/shared';
import type { AuthUser } from '../common/current-user.decorator';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import {
  appointments,
  doctorProfiles,
  prescriptionItems,
  prescriptions,
  users,
} from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { renderPrescriptionPdf, type PrescriptionPdfData } from './prescription-pdf';

type PrescriptionRow = typeof prescriptions.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;
type PrescriptionItemRow = typeof prescriptionItems.$inferSelect;
type DoctorProfileRow = typeof doctorProfiles.$inferSelect;

const HISTORY_LIMIT_MAX = 50;

/** Same order the dedicated query uses: by position, then id. */
function sortItems(items: PrescriptionItemRow[]): PrescriptionItemRow[] {
  return [...items].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
}

@Injectable()
export class PrescriptionsService {
  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /* ------------------------------------------------------------------ write */

  async create(user: AuthUser, input: CreatePrescriptionInput): Promise<PrescriptionView> {
    const appt = await this.loadAppointment(input.appointmentId);
    if (appt.doctorId !== user.id) {
      throw new ForbiddenException('only the consulting doctor can write this prescription');
    }
    if (appt.status === 'CANCELLED') {
      throw new BadRequestException('the appointment was cancelled');
    }
    const existing = await this.db.query.prescriptions.findFirst({
      where: eq(prescriptions.appointmentId, appt.id),
      columns: { id: true },
    });
    if (existing) {
      throw new BadRequestException('a prescription already exists for this appointment');
    }

    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(prescriptions)
        .values({
          appointmentId: appt.id,
          doctorId: appt.doctorId,
          patientId: appt.patientId,
          symptoms: input.symptoms ?? null,
          diagnosis: input.diagnosis,
          advice: input.advice ?? null,
          notes: input.notes ?? null,
          followUpDate: input.followUpDate ?? null,
          drugCategoryFlags: input.drugCategoryFlags,
        })
        .returning({ id: prescriptions.id });
      await tx.insert(prescriptionItems).values(itemValues(row.id, input.items));
      return row.id;
    });

    return this.buildView(user, id);
  }

  async update(
    user: AuthUser,
    id: string,
    input: UpdatePrescriptionInput,
  ): Promise<PrescriptionView> {
    const row = await this.loadPrescription(id);
    if (row.doctorId !== user.id) throw new ForbiddenException('not your prescription');
    if (row.finalizedAt) throw new BadRequestException('this prescription is already finalised');

    await this.db.transaction(async (tx) => {
      await tx
        .update(prescriptions)
        .set({
          symptoms: input.symptoms ?? null,
          diagnosis: input.diagnosis,
          advice: input.advice ?? null,
          notes: input.notes ?? null,
          followUpDate: input.followUpDate ?? null,
          drugCategoryFlags: input.drugCategoryFlags,
        })
        .where(eq(prescriptions.id, id));
      await tx.delete(prescriptionItems).where(eq(prescriptionItems.prescriptionId, id));
      await tx.insert(prescriptionItems).values(itemValues(id, input.items));
    });

    return this.buildView(user, id);
  }

  /** Renders + stores the PDF, marks the appointment COMPLETED, notifies the patient. */
  async finalize(user: AuthUser, id: string): Promise<PrescriptionView> {
    const row = await this.loadPrescription(id);
    if (row.doctorId !== user.id) throw new ForbiddenException('not your prescription');
    if (row.finalizedAt) return this.buildView(user, id); // idempotent

    const pdf = await this.renderFor(row);
    const pdfKey = this.storage.configured
      ? await this.storage.uploadPrescriptionPdf(id, pdf)
      : null;
    const finalizedAt = new Date();

    await this.db.transaction(async (tx) => {
      await tx
        .update(prescriptions)
        .set({ finalizedAt, pdfKey })
        .where(eq(prescriptions.id, id));
      await tx
        .update(appointments)
        .set({ status: 'COMPLETED' })
        .where(and(eq(appointments.id, row.appointmentId), ne(appointments.status, 'CANCELLED')));
    });

    const payload = { appointmentId: row.appointmentId, prescriptionId: id };
    await this.notifications.enqueueMany([
      { userId: row.patientId, kind: 'prescription_ready', channel: 'PUSH', scheduledFor: new Date(), payload },
      { userId: row.patientId, kind: 'prescription_ready', channel: 'EMAIL', scheduledFor: new Date(), payload },
    ]);

    return this.buildView(user, id, { ...row, finalizedAt, pdfKey });
  }

  /* ------------------------------------------------------------------- read */

  async get(user: AuthUser, id: string): Promise<PrescriptionView> {
    const row = await this.loadPrescription(id);
    await this.assertCanRead(user, row);
    return this.buildView(user, id, row);
  }

  async getForAppointment(user: AuthUser, appointmentId: string): Promise<PrescriptionView> {
    const appt = await this.loadAppointment(appointmentId);
    this.assertParticipant(user, appt);
    const row = await this.db.query.prescriptions.findFirst({
      where: eq(prescriptions.appointmentId, appointmentId),
    });
    if (!row) throw new NotFoundException('no prescription for this appointment');
    await this.assertCanRead(user, row);
    return this.buildView(user, row.id, row);
  }

  /** PDF bytes: served from storage when available, otherwise rendered fresh. */
  async pdf(user: AuthUser, id: string): Promise<{ buffer: Buffer; filename: string }> {
    const row = await this.loadPrescription(id);
    await this.assertCanRead(user, row);
    if (!row.finalizedAt) throw new BadRequestException('this prescription is not finalised yet');

    let buffer: Buffer | null = null;
    if (row.pdfKey) buffer = await this.storage.fetchPdf(row.pdfKey);
    buffer ??= await this.renderFor(row);

    const day = row.finalizedAt.toISOString().slice(0, 10);
    return { buffer, filename: `prescription-${day}.pdf` };
  }

  async myHistory(
    user: AuthUser,
    query: { cursor?: string; limit: number; doctorId?: string },
  ): Promise<MedicalHistory> {
    return this.listHistory(
      { patientId: user.id, doctorId: query.doctorId, viewerIsPatient: true },
      query,
    );
  }

  async patientHistory(
    user: AuthUser,
    patientId: string,
    query: { cursor?: string; limit: number },
  ): Promise<MedicalHistory> {
    return this.listHistory({ patientId, doctorId: user.id, viewerIsPatient: false }, query);
  }

  /* ---------------------------------------------------------------- helpers */

  private async listHistory(
    scope: { patientId: string; doctorId?: string; viewerIsPatient: boolean },
    query: { cursor?: string; limit: number },
  ): Promise<MedicalHistory> {
    const limit = Math.min(query.limit, HISTORY_LIMIT_MAX);
    const cursor = query.cursor ? decodeCursor(query.cursor) : null;
    const cursorClause: SQL | undefined = cursor
      ? or(
          lt(appointments.scheduledStart, cursor.start),
          and(eq(appointments.scheduledStart, cursor.start), lt(appointments.id, cursor.id)),
        )
      : undefined;

    const rows = await this.db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, scope.patientId),
          scope.doctorId ? eq(appointments.doctorId, scope.doctorId) : undefined,
          ne(appointments.status, 'CANCELLED'),
          cursorClause,
        ),
      )
      .orderBy(desc(appointments.scheduledStart), desc(appointments.id))
      .limit(limit + 1);

    const page = rows.slice(0, limit);
    const nextCursor =
      rows.length > limit
        ? encodeCursor(page[page.length - 1].scheduledStart, page[page.length - 1].id)
        : null;

    const items = await Promise.all(
      page.map((appt) => this.toHistoryEntry(appt, scope.viewerIsPatient)),
    );
    return { items, nextCursor };
  }

  private async toHistoryEntry(
    appt: AppointmentRow,
    viewerIsPatient: boolean,
  ): Promise<MedicalHistoryEntry> {
    const [doctor, patient, rx, docProfile] = await Promise.all([
      this.db.query.users.findFirst({ where: eq(users.id, appt.doctorId), columns: { fullName: true } }),
      this.db.query.users.findFirst({ where: eq(users.id, appt.patientId), columns: { fullName: true } }),
      this.db.query.prescriptions.findFirst({
        where: eq(prescriptions.appointmentId, appt.id),
        with: { items: true },
      }),
      this.db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, appt.doctorId) }),
    ]);

    const doctorName = doctor?.fullName ?? 'Unknown';
    const patientName = patient?.fullName ?? 'Unknown';

    // Patients only see finalised prescriptions in their history.
    const visibleRx = rx && (!viewerIsPatient || rx.finalizedAt) ? rx : null;

    return {
      appointmentId: appt.id,
      scheduledStart: appt.scheduledStart.toISOString(),
      status: appt.status,
      reasonForVisit: appt.reasonForVisit,
      doctorName,
      patientName,
      prescription: visibleRx
        ? this.toView(visibleRx, {
            items: sortItems(visibleRx.items),
            docProfile,
            doctorName,
            patientName,
            scheduledStart: appt.scheduledStart,
            viewerIsPatient,
          })
        : null,
    };
  }

  private async buildView(
    user: AuthUser,
    id: string,
    known?: PrescriptionRow,
  ): Promise<PrescriptionView> {
    const row =
      known ??
      (await this.db.query.prescriptions.findFirst({ where: eq(prescriptions.id, id) }));
    if (!row) throw new NotFoundException('prescription not found');

    const [items, appt, docProfile, doctorUser, patientUser] = await Promise.all([
      this.db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, id))
        .orderBy(prescriptionItems.position, prescriptionItems.id),
      this.db.query.appointments.findFirst({ where: eq(appointments.id, row.appointmentId) }),
      this.db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, row.doctorId) }),
      this.db.query.users.findFirst({ where: eq(users.id, row.doctorId), columns: { fullName: true } }),
      this.db.query.users.findFirst({ where: eq(users.id, row.patientId), columns: { fullName: true } }),
    ]);

    return this.toView(row, {
      items,
      docProfile,
      doctorName: doctorUser?.fullName ?? 'Unknown',
      patientName: patientUser?.fullName ?? 'Unknown',
      scheduledStart: appt?.scheduledStart ?? row.issuedAt,
      viewerIsPatient: user.id === row.patientId,
    });
  }

  /** Maps a prescription row + its context to the wire shape. `notes` is
   *  doctor-only and nulled for the patient. */
  private toView(
    row: PrescriptionRow,
    ctx: {
      items: PrescriptionItemRow[];
      docProfile?: DoctorProfileRow | null;
      doctorName: string;
      patientName: string;
      scheduledStart: Date;
      viewerIsPatient: boolean;
    },
  ): PrescriptionView {
    return {
      id: row.id,
      appointmentId: row.appointmentId,
      status: row.finalizedAt ? 'FINALIZED' : 'DRAFT',
      issuedAt: row.issuedAt.toISOString(),
      finalizedAt: row.finalizedAt ? row.finalizedAt.toISOString() : null,
      symptoms: row.symptoms ?? null,
      diagnosis: row.diagnosis,
      advice: row.advice ?? null,
      notes: ctx.viewerIsPatient ? null : (row.notes ?? null),
      followUpDate: row.followUpDate ?? null,
      drugCategoryFlags: row.drugCategoryFlags as PrescriptionView['drugCategoryFlags'],
      items: ctx.items.map((it) => ({
        id: it.id,
        drugName: it.drugName,
        strength: it.strength ?? undefined,
        form: it.form ?? undefined,
        frequency: it.frequency,
        durationDays: it.durationDays,
        instructions: it.instructions ?? undefined,
      })),
      pdfReady: Boolean(row.finalizedAt),
      doctorName: ctx.doctorName,
      doctorQualifications: ctx.docProfile?.qualifications ?? '',
      medicalCouncil: ctx.docProfile?.medicalCouncil ?? '',
      registrationNumber: ctx.docProfile?.registrationNumber ?? '',
      patientName: ctx.patientName,
      scheduledStart: ctx.scheduledStart.toISOString(),
    };
  }

  private async renderFor(row: PrescriptionRow): Promise<Buffer> {
    const [items, appt, docProfile, doctorUser, patientUser] = await Promise.all([
      this.db
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, row.id))
        .orderBy(prescriptionItems.position, prescriptionItems.id),
      this.db.query.appointments.findFirst({ where: eq(appointments.id, row.appointmentId) }),
      this.db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, row.doctorId) }),
      this.db.query.users.findFirst({ where: eq(users.id, row.doctorId), columns: { fullName: true } }),
      this.db.query.users.findFirst({ where: eq(users.id, row.patientId), columns: { fullName: true } }),
    ]);

    const data: PrescriptionPdfData = {
      issuedAt: row.finalizedAt ?? row.issuedAt,
      doctorName: doctorUser?.fullName ?? 'Unknown',
      doctorQualifications: docProfile?.qualifications ?? '',
      medicalCouncil: docProfile?.medicalCouncil ?? '',
      registrationNumber: docProfile?.registrationNumber ?? '',
      patientName: patientUser?.fullName ?? 'Unknown',
      scheduledStart: appt?.scheduledStart ?? row.issuedAt,
      symptoms: row.symptoms,
      diagnosis: row.diagnosis,
      advice: row.advice,
      notes: row.notes,
      followUpDate: row.followUpDate,
      drugCategoryFlags: row.drugCategoryFlags,
      items: items.map((it) => ({
        drugName: it.drugName,
        strength: it.strength,
        form: it.form,
        frequency: it.frequency,
        durationDays: it.durationDays,
        instructions: it.instructions,
      })),
    };
    return renderPrescriptionPdf(data);
  }

  private async loadAppointment(id: string): Promise<AppointmentRow> {
    const appt = await this.db.query.appointments.findFirst({ where: eq(appointments.id, id) });
    if (!appt) throw new NotFoundException('appointment not found');
    return appt;
  }

  private async loadPrescription(id: string): Promise<PrescriptionRow> {
    const row = await this.db.query.prescriptions.findFirst({ where: eq(prescriptions.id, id) });
    if (!row) throw new NotFoundException('prescription not found');
    return row;
  }

  private assertParticipant(user: AuthUser, appt: AppointmentRow): void {
    if (appt.patientId !== user.id && appt.doctorId !== user.id) {
      throw new ForbiddenException('not your appointment');
    }
  }

  /** The doctor always; the patient only once the prescription is finalised. */
  private async assertCanRead(user: AuthUser, row: PrescriptionRow): Promise<void> {
    if (user.id === row.doctorId) return;
    if (user.id === row.patientId) {
      if (!row.finalizedAt) throw new NotFoundException('prescription not found');
      return;
    }
    throw new ForbiddenException('not your prescription');
  }
}

function itemValues(
  prescriptionId: string,
  items: CreatePrescriptionInput['items'],
): (typeof prescriptionItems.$inferInsert)[] {
  return items.map((it, i) => ({
    prescriptionId,
    position: i,
    drugName: it.drugName,
    strength: it.strength ?? null,
    form: it.form ?? null,
    frequency: it.frequency,
    durationDays: it.durationDays,
    instructions: it.instructions ?? null,
  }));
}

interface HistoryCursor {
  start: Date;
  id: string;
}
function encodeCursor(start: Date, id: string): string {
  return Buffer.from(`${start.toISOString()}|${id}`).toString('base64url');
}
function decodeCursor(raw: string): HistoryCursor {
  const [iso, id] = Buffer.from(raw, 'base64url').toString().split('|');
  return { start: new Date(iso), id };
}
