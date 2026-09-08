import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { AppointmentIntakeInput, AppointmentIntakeView } from '@carelink/shared';
import type { AuthUser } from '../common/current-user.decorator';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { appointmentIntakes, appointments } from '../db/schema';

type IntakeRow = typeof appointmentIntakes.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;

@Injectable()
export class IntakeService {
  private get db() {
    return this.connection.db;
  }

  constructor(@Inject(DB) private readonly connection: Database) {}

  /** Either participant can read the intake; returns null when none exists yet. */
  async get(user: AuthUser, appointmentId: string): Promise<AppointmentIntakeView | null> {
    await this.requireParticipant(user, appointmentId);
    const row = await this.db.query.appointmentIntakes.findFirst({
      where: eq(appointmentIntakes.appointmentId, appointmentId),
    });
    return row ? toView(row) : null;
  }

  /** The patient fills / edits the intake up to (but not after) the consult. */
  async upsert(
    user: AuthUser,
    appointmentId: string,
    input: AppointmentIntakeInput,
  ): Promise<AppointmentIntakeView> {
    const appt = await this.requireParticipant(user, appointmentId);
    if (appt.patientId !== user.id) {
      throw new ForbiddenException('only the patient can fill the intake form');
    }
    if (appt.status === 'CANCELLED' || appt.status === 'COMPLETED') {
      throw new BadRequestException(`the consultation is ${appt.status.toLowerCase()}`);
    }

    const fields = normalize(input);
    const [row] = await this.db
      .insert(appointmentIntakes)
      .values({ appointmentId, ...fields })
      .onConflictDoUpdate({
        target: appointmentIntakes.appointmentId,
        set: { ...fields, updatedAt: new Date() },
      })
      .returning();
    return toView(row);
  }

  private async requireParticipant(user: AuthUser, appointmentId: string): Promise<AppointmentRow> {
    const row = await this.db.query.appointments.findFirst({
      where: eq(appointments.id, appointmentId),
    });
    if (!row) throw new NotFoundException('appointment not found');
    if (row.patientId !== user.id && row.doctorId !== user.id) {
      throw new ForbiddenException('not your appointment');
    }
    return row;
  }
}

/** `undefined` → `null` for the nullable columns. */
function normalize(input: AppointmentIntakeInput) {
  return {
    chiefComplaint: input.chiefComplaint,
    symptomsStarted: input.symptomsStarted ?? null,
    severity: input.severity ?? null,
    currentMedications: input.currentMedications ?? null,
    allergies: input.allergies ?? null,
    additionalNotes: input.additionalNotes ?? null,
  };
}

function toView(row: IntakeRow): AppointmentIntakeView {
  return {
    appointmentId: row.appointmentId,
    chiefComplaint: row.chiefComplaint,
    symptomsStarted: row.symptomsStarted ?? undefined,
    severity: row.severity ?? undefined,
    currentMedications: row.currentMedications ?? undefined,
    allergies: row.allergies ?? undefined,
    additionalNotes: row.additionalNotes ?? undefined,
    updatedAt: row.updatedAt.toISOString(),
  };
}
