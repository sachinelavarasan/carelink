import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, inArray, lte, ne, sql } from 'drizzle-orm';
import type {
  AvailabilityExceptionInput,
  AvailabilityExceptionOut,
  AvailabilityRuleOut,
  DoctorPublic,
  ListDoctorsQuery,
  ReplaceAvailabilityRulesInput,
  Slot,
  VisitedDoctor,
} from '@carelink/shared';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import {
  appointments,
  availabilityExceptions,
  availabilityRules,
  doctorProfiles,
  users,
} from '../db/schema';
import { expandSlots } from './slots';

const BOOKED_STATUSES = ['CONFIRMED', 'REQUESTED', 'COMPLETED'] as const;

@Injectable()
export class AvailabilityService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listDoctors(query: Partial<ListDoctorsQuery> = {}): Promise<DoctorPublic[]> {
    const rows = await this.db
      .select({
        id: users.id,
        fullName: users.fullName,
        specializations: doctorProfiles.specializations,
        qualifications: doctorProfiles.qualifications,
        yearsExperience: doctorProfiles.yearsExperience,
        bio: doctorProfiles.bio,
        consultationFeeInr: doctorProfiles.consultationFeeInr,
        clinicName: doctorProfiles.clinicName,
        verifiedAt: doctorProfiles.verifiedAt,
      })
      .from(doctorProfiles)
      .innerJoin(users, eq(users.id, doctorProfiles.userId));

    let doctors = rows.filter((r) => r.verifiedAt !== null).map(stripVerified);

    const q = query.q?.trim().toLowerCase();
    if (q) {
      doctors = doctors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          (d.bio ?? '').toLowerCase().includes(q) ||
          d.specializations.some((s) => s.toLowerCase().includes(q)),
      );
    }
    const spec = query.specialization?.trim().toLowerCase();
    if (spec) {
      doctors = doctors.filter((d) => d.specializations.some((s) => s.toLowerCase() === spec));
    }

    const sort = query.sort ?? 'name';
    doctors.sort((a, b) => {
      if (sort === 'fee') return a.consultationFeeInr - b.consultationFeeInr;
      if (sort === 'experience') return b.yearsExperience - a.yearsExperience;
      return a.fullName.localeCompare(b.fullName);
    });
    return doctors;
  }

  async getDoctor(userId: string): Promise<DoctorPublic> {
    const doctor = (await this.listDoctors()).find((d) => d.id === userId);
    if (!doctor) throw new NotFoundException('doctor not found');
    return doctor;
  }

  /** Distinct specialization labels across verified doctors, for the filter UI. */
  async listSpecializations(): Promise<string[]> {
    const doctors = await this.listDoctors();
    const set = new Set<string>();
    for (const d of doctors) for (const s of d.specializations) set.add(s);
    return [...set].sort((a, b) => a.localeCompare(b));
  }

  /** Doctors this patient has already had appointments with, most recent first. */
  async visitedDoctors(patientUserId: string): Promise<VisitedDoctor[]> {
    const grouped = await this.db
      .select({
        doctorId: appointments.doctorId,
        lastVisitedAt: sql<string>`max(${appointments.scheduledStart})`,
        visitCount: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, patientUserId),
          ne(appointments.status, 'CANCELLED'),
        ),
      )
      .groupBy(appointments.doctorId)
      .orderBy(desc(sql`max(${appointments.scheduledStart})`));

    if (grouped.length === 0) return [];
    const byId = new Map((await this.listDoctors()).map((d) => [d.id, d]));
    return grouped
      .map((g) => {
        const doc = byId.get(g.doctorId);
        if (!doc) return null;
        return {
          ...doc,
          lastVisitedAt: new Date(g.lastVisitedAt).toISOString(),
          visitCount: g.visitCount,
        };
      })
      .filter((d): d is VisitedDoctor => d !== null);
  }

  private async profileId(userId: string): Promise<string> {
    const profile = await this.db.query.doctorProfiles.findFirst({
      where: eq(doctorProfiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) throw new NotFoundException('doctor profile not found');
    return profile.id;
  }

  async getSlots(
    doctorUserId: string,
    from: string,
    to: string,
    excludeAppointmentId?: string,
  ): Promise<Slot[]> {
    if (to < from) throw new ForbiddenException('`to` must be on or after `from`');
    if (daysBetween(from, to) > 60) throw new ForbiddenException('range too wide (max 60 days)');

    const profileId = await this.profileId(doctorUserId);

    const [rules, exceptions, booked] = await Promise.all([
      this.db.select().from(availabilityRules).where(eq(availabilityRules.doctorId, profileId)),
      this.db
        .select()
        .from(availabilityExceptions)
        .where(
          and(
            eq(availabilityExceptions.doctorId, profileId),
            gte(availabilityExceptions.date, from),
            lte(availabilityExceptions.date, to),
          ),
        ),
      this.db
        .select({ start: appointments.scheduledStart, end: appointments.scheduledEnd })
        .from(appointments)
        .where(
          and(
            eq(appointments.doctorId, doctorUserId),
            inArray(appointments.status, [...BOOKED_STATUSES]),
            excludeAppointmentId ? ne(appointments.id, excludeAppointmentId) : undefined,
          ),
        ),
    ]);

    return expandSlots(
      rules.map((r) => ({ ...r, effectiveTo: r.effectiveTo ?? null })),
      exceptions.map((e) => ({
        date: e.date,
        isClosed: e.isClosed,
        startTime: e.startTime,
        endTime: e.endTime,
      })),
      booked,
      { from, to },
    );
  }

  async listOwnRules(doctorUserId: string): Promise<AvailabilityRuleOut[]> {
    const profileId = await this.profileId(doctorUserId);
    const rows = await this.db
      .select()
      .from(availabilityRules)
      .where(eq(availabilityRules.doctorId, profileId));
    return rows.map((r) => ({
      id: r.id,
      weekday: r.weekday,
      startTime: r.startTime,
      endTime: r.endTime,
      slotMinutes: r.slotMinutes,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
    }));
  }

  async replaceRules(
    doctorUserId: string,
    input: ReplaceAvailabilityRulesInput,
  ): Promise<AvailabilityRuleOut[]> {
    const profileId = await this.profileId(doctorUserId);
    for (const r of input.rules) {
      if (r.endTime <= r.startTime) {
        throw new ForbiddenException(`rule for weekday ${r.weekday}: endTime must be after startTime`);
      }
    }
    await this.db.transaction(async (tx) => {
      await tx.delete(availabilityRules).where(eq(availabilityRules.doctorId, profileId));
      if (input.rules.length > 0) {
        await tx
          .insert(availabilityRules)
          .values(input.rules.map((r) => ({ ...r, doctorId: profileId, effectiveTo: r.effectiveTo ?? null })));
      }
    });
    return this.listOwnRules(doctorUserId);
  }

  async listOwnExceptions(doctorUserId: string): Promise<AvailabilityExceptionOut[]> {
    const profileId = await this.profileId(doctorUserId);
    const rows = await this.db
      .select()
      .from(availabilityExceptions)
      .where(eq(availabilityExceptions.doctorId, profileId));
    return rows.map((e) => ({
      id: e.id,
      date: e.date,
      isClosed: e.isClosed,
      startTime: e.startTime ?? undefined,
      endTime: e.endTime ?? undefined,
    }));
  }

  async upsertException(
    doctorUserId: string,
    input: AvailabilityExceptionInput,
  ): Promise<AvailabilityExceptionOut> {
    const profileId = await this.profileId(doctorUserId);
    const [row] = await this.db
      .insert(availabilityExceptions)
      .values({ ...input, doctorId: profileId })
      .onConflictDoUpdate({
        target: [availabilityExceptions.doctorId, availabilityExceptions.date],
        set: { isClosed: input.isClosed, startTime: input.startTime, endTime: input.endTime },
      })
      .returning();
    return {
      id: row.id,
      date: row.date,
      isClosed: row.isClosed,
      startTime: row.startTime ?? undefined,
      endTime: row.endTime ?? undefined,
    };
  }

  async deleteException(doctorUserId: string, id: string): Promise<void> {
    const profileId = await this.profileId(doctorUserId);
    await this.db
      .delete(availabilityExceptions)
      .where(and(eq(availabilityExceptions.id, id), eq(availabilityExceptions.doctorId, profileId)));
  }

  /** Used by AppointmentsService to validate a chosen slot. Returns the slot (with its end) if free. */
  async findFreeSlot(
    doctorUserId: string,
    startIso: string,
    excludeAppointmentId?: string,
  ): Promise<Slot | null> {
    const date = startIso.slice(0, 10);
    // widen the range to cover clinic-tz vs utc date edges
    const slots = await this.getSlots(
      doctorUserId,
      shiftDate(date, -1),
      shiftDate(date, 1),
      excludeAppointmentId,
    );
    return slots.find((s) => s.start === new Date(startIso).toISOString()) ?? null;
  }
}

function stripVerified(row: DoctorPublic & { verifiedAt: unknown }): DoctorPublic {
  const copy = { ...row } as Partial<typeof row>;
  delete copy.verifiedAt;
  return copy as DoctorPublic;
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
