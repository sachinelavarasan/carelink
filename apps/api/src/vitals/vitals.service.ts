import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { Vital, VitalEntryInput, VitalsList } from '@carelink/shared';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { appointments, patientVitals } from '../db/schema';

type VitalRow = typeof patientVitals.$inferSelect;

@Injectable()
export class VitalsService {
  private get db() {
    return this.connection.db;
  }

  constructor(@Inject(DB) private readonly connection: Database) {}

  /** Newest first; capped — this feeds a chart, not an audit. */
  private static readonly LIMIT = 500;

  listOwn(patientId: string): Promise<VitalsList> {
    return this.fetch(patientId);
  }

  async add(patientId: string, input: VitalEntryInput): Promise<Vital> {
    const [row] = await this.db
      .insert(patientVitals)
      .values({
        patientId,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : new Date(),
        weightKg: input.weightKg ?? null,
        systolic: input.systolic ?? null,
        diastolic: input.diastolic ?? null,
        heartRate: input.heartRate ?? null,
        bloodSugarMgDl: input.bloodSugarMgDl ?? null,
        temperatureC: input.temperatureC ?? null,
        notes: input.notes ?? null,
      })
      .returning();
    return toVital(row);
  }

  async remove(patientId: string, id: string): Promise<void> {
    await this.db
      .delete(patientVitals)
      .where(and(eq(patientVitals.id, id), eq(patientVitals.patientId, patientId)));
  }

  /** A doctor may read a patient's vitals only if they share an appointment. */
  async listForPatient(doctorId: string, patientId: string): Promise<VitalsList> {
    const shared = await this.db.query.appointments.findFirst({
      where: and(eq(appointments.doctorId, doctorId), eq(appointments.patientId, patientId)),
      columns: { id: true },
    });
    if (!shared) throw new ForbiddenException('no consultation history with this patient');
    return this.fetch(patientId);
  }

  private async fetch(patientId: string): Promise<VitalsList> {
    const rows = await this.db
      .select()
      .from(patientVitals)
      .where(eq(patientVitals.patientId, patientId))
      .orderBy(desc(patientVitals.recordedAt))
      .limit(VitalsService.LIMIT);
    return { items: rows.map(toVital) };
  }
}

function toVital(row: VitalRow): Vital {
  return {
    id: row.id,
    recordedAt: row.recordedAt.toISOString(),
    weightKg: row.weightKg ?? null,
    systolic: row.systolic ?? null,
    diastolic: row.diastolic ?? null,
    heartRate: row.heartRate ?? null,
    bloodSugarMgDl: row.bloodSugarMgDl ?? null,
    temperatureC: row.temperatureC ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
