import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type {
  DrugCategoryFlag,
  PrescriptionTemplate,
  PrescriptionTemplateInput,
} from '@carelink/shared';
import type { Database } from '../db';
import { DB } from '../db/db.module';
import { prescriptionTemplates } from '../db/schema';

type TemplateRow = typeof prescriptionTemplates.$inferSelect;

@Injectable()
export class PrescriptionTemplatesService {
  private get db() {
    return this.connection.db;
  }

  constructor(@Inject(DB) private readonly connection: Database) {}

  async list(doctorId: string): Promise<PrescriptionTemplate[]> {
    const rows = await this.db
      .select()
      .from(prescriptionTemplates)
      .where(eq(prescriptionTemplates.doctorId, doctorId))
      .orderBy(desc(prescriptionTemplates.updatedAt));
    return rows.map(toTemplate);
  }

  async create(
    doctorId: string,
    input: PrescriptionTemplateInput,
  ): Promise<PrescriptionTemplate> {
    const [row] = await this.db
      .insert(prescriptionTemplates)
      .values({ doctorId, ...normalize(input) })
      .returning();
    return toTemplate(row);
  }

  async update(
    doctorId: string,
    id: string,
    input: PrescriptionTemplateInput,
  ): Promise<PrescriptionTemplate> {
    await this.requireOwn(doctorId, id);
    const [row] = await this.db
      .update(prescriptionTemplates)
      .set({ ...normalize(input), updatedAt: new Date() })
      .where(eq(prescriptionTemplates.id, id))
      .returning();
    return toTemplate(row);
  }

  async remove(doctorId: string, id: string): Promise<void> {
    await this.requireOwn(doctorId, id);
    await this.db.delete(prescriptionTemplates).where(eq(prescriptionTemplates.id, id));
  }

  private async requireOwn(doctorId: string, id: string): Promise<void> {
    const row = await this.db.query.prescriptionTemplates.findFirst({
      where: eq(prescriptionTemplates.id, id),
      columns: { doctorId: true },
    });
    if (!row) throw new NotFoundException('template not found');
    if (row.doctorId !== doctorId) throw new ForbiddenException('not your template');
  }
}

function normalize(input: PrescriptionTemplateInput) {
  return {
    name: input.name,
    symptoms: input.symptoms ?? null,
    diagnosis: input.diagnosis ?? null,
    advice: input.advice ?? null,
    followUpDays: input.followUpDays ?? null,
    drugCategoryFlags: input.drugCategoryFlags,
    items: input.items,
  };
}

function toTemplate(row: TemplateRow): PrescriptionTemplate {
  return {
    id: row.id,
    name: row.name,
    symptoms: row.symptoms ?? undefined,
    diagnosis: row.diagnosis ?? undefined,
    advice: row.advice ?? undefined,
    followUpDays: row.followUpDays ?? undefined,
    drugCategoryFlags: row.drugCategoryFlags as DrugCategoryFlag[],
    items: row.items,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
