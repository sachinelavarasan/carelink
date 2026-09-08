import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { and, desc, eq, isNotNull, or } from 'drizzle-orm';
import type {
  AvatarResult,
  DoctorProfileInput,
  DoctorProfileOut,
  Me,
  PatientDataExport,
  PatientProfileInput,
  PatientProfileOut,
  UpdateAccountInput,
} from '@carelink/shared';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { StorageService } from '../storage/storage.service';
import {
  appointments,
  doctorProfiles,
  medicalDocuments,
  messages,
  patientProfiles,
  prescriptions,
  users,
} from '../db/schema';

@Injectable()
export class UsersService {
  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly storage: StorageService,
  ) {}

  async getMe(userId: string): Promise<Me> {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('user not found');

    const [patient, doctor] = await Promise.all([
      this.db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, userId) }),
      this.db.query.doctorProfiles.findFirst({ where: eq(doctorProfiles.userId, userId) }),
    ]);

    return {
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerifiedAt !== null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      patientProfile: patient ? this.toPatientOut(patient) : null,
      doctorProfile: doctor ? this.toDoctorOut(doctor) : null,
    };
  }

  /**
   * DPDP erasure — hard delete. Removes the user and every row that references
   * them, in FK-safe order (the rest cascade from `users`). This also drops the
   * shared consultation record: an appointment vanishes for *both* parties.
   * Gated to PATIENT accounts at the controller — doctor removal is an ops task.
   */
  async deleteAccount(userId: string, password: string): Promise<{ ok: true }> {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('user not found');
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('incorrect password');
    }

    await this.db.transaction(async (tx) => {
      await tx.delete(messages).where(eq(messages.senderId, userId));
      await tx
        .delete(prescriptions)
        .where(or(eq(prescriptions.patientId, userId), eq(prescriptions.doctorId, userId)));
      await tx
        .delete(appointments)
        .where(or(eq(appointments.patientId, userId), eq(appointments.doctorId, userId)));
      await tx
        .delete(medicalDocuments)
        .where(
          or(eq(medicalDocuments.patientId, userId), eq(medicalDocuments.uploadedById, userId)),
        );
      // Cascades: patient/doctor profiles (→ availability_*), notifications,
      // push_tokens, any remaining medical_documents by patientId.
      await tx.delete(users).where(eq(users.id, userId));
    });

    return { ok: true };
  }

  /**
   * DPDP right to access — everything CareLink holds about this patient, as a
   * plain object the controller streams as a JSON download. Read-only; the
   * doctor-only `notes` on a prescription are never included, matching the rest
   * of the patient-facing contract.
   */
  async exportPatientData(userId: string): Promise<PatientDataExport> {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('user not found');

    const [profile, apptRows, rxRows, msgRows, docRows] = await Promise.all([
      this.db.query.patientProfiles.findFirst({ where: eq(patientProfiles.userId, userId) }),
      this.db
        .select({ appt: appointments, doctorName: users.fullName })
        .from(appointments)
        .innerJoin(users, eq(users.id, appointments.doctorId))
        .where(eq(appointments.patientId, userId))
        .orderBy(desc(appointments.scheduledStart)),
      this.db.query.prescriptions.findMany({
        where: and(eq(prescriptions.patientId, userId), isNotNull(prescriptions.finalizedAt)),
        with: { items: true },
        orderBy: (p, { desc: d }) => [d(p.issuedAt)],
      }),
      this.db
        .select()
        .from(messages)
        .where(eq(messages.senderId, userId))
        .orderBy(desc(messages.sentAt)),
      this.db
        .select()
        .from(medicalDocuments)
        .where(eq(medicalDocuments.patientId, userId))
        .orderBy(desc(medicalDocuments.uploadedAt)),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerifiedAt !== null,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt.toISOString(),
      },
      patientProfile: profile ? this.toPatientOut(profile) : null,
      appointments: apptRows.map(({ appt, doctorName }) => ({
        id: appt.id,
        patientId: appt.patientId,
        doctorId: appt.doctorId,
        scheduledStart: appt.scheduledStart.toISOString(),
        scheduledEnd: appt.scheduledEnd.toISOString(),
        status: appt.status,
        reasonForVisit: appt.reasonForVisit,
        consentAcceptedAt: appt.consentAcceptedAt ? appt.consentAcceptedAt.toISOString() : null,
        identityVerifiedAt: appt.identityVerifiedAt ? appt.identityVerifiedAt.toISOString() : null,
        cancelledBy: appt.cancelledBy ?? null,
        cancelReason: appt.cancelReason ?? null,
        createdAt: appt.createdAt.toISOString(),
        doctorName,
      })),
      prescriptions: rxRows.map((rx) => ({
        id: rx.id,
        appointmentId: rx.appointmentId,
        issuedAt: rx.issuedAt.toISOString(),
        finalizedAt: rx.finalizedAt ? rx.finalizedAt.toISOString() : null,
        symptoms: rx.symptoms ?? null,
        diagnosis: rx.diagnosis,
        advice: rx.advice ?? null,
        followUpDate: rx.followUpDate ?? null,
        drugCategoryFlags: rx.drugCategoryFlags,
        items: [...rx.items]
          .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
          .map((it) => ({
            id: it.id,
            drugName: it.drugName,
            strength: it.strength ?? undefined,
            form: it.form ?? undefined,
            frequency: it.frequency,
            durationDays: it.durationDays,
            instructions: it.instructions ?? undefined,
          })),
      })),
      messages: msgRows.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        senderId: m.senderId,
        body: m.body,
        attachmentKey: m.attachmentKey ?? null,
        sentAt: m.sentAt.toISOString(),
        readAt: m.readAt ? m.readAt.toISOString() : null,
      })),
      documents: docRows.map((d) => ({
        id: d.id,
        kind: d.kind,
        title: d.title,
        uploadedAt: d.uploadedAt.toISOString(),
      })),
    };
  }

  /** Update the account's own display name / phone. */
  async updateAccount(userId: string, input: UpdateAccountInput): Promise<Me> {
    const [row] = await this.db
      .update(users)
      .set({ fullName: input.fullName, phone: input.phone ?? null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (!row) throw new NotFoundException('user not found');
    return this.getMe(userId);
  }

  /** Uploads a new avatar to storage and points the user row at its URL. */
  async setAvatar(userId: string, image: Buffer): Promise<AvatarResult> {
    const user = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new NotFoundException('user not found');
    const avatarUrl = await this.storage.uploadAvatar(userId, image);
    await this.db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
    return { avatarUrl };
  }

  /** Clears the user's avatar — deletes the stored asset, nulls the column. */
  async clearAvatar(userId: string): Promise<AvatarResult> {
    await this.storage.deleteAvatar(userId);
    await this.db.update(users).set({ avatarUrl: null }).where(eq(users.id, userId));
    return { avatarUrl: null };
  }

  async upsertPatientProfile(userId: string, input: PatientProfileInput): Promise<PatientProfileOut> {
    const [row] = await this.db
      .insert(patientProfiles)
      .values({ userId, ...input })
      .onConflictDoUpdate({ target: patientProfiles.userId, set: { ...input, updatedAt: new Date() } })
      .returning();
    return this.toPatientOut(row);
  }

  async upsertDoctorProfile(userId: string, input: DoctorProfileInput): Promise<DoctorProfileOut> {
    const [row] = await this.db
      .insert(doctorProfiles)
      .values({ userId, ...input })
      .onConflictDoUpdate({ target: doctorProfiles.userId, set: { ...input, updatedAt: new Date() } })
      .returning();
    return this.toDoctorOut(row);
  }

  private toPatientOut(row: typeof patientProfiles.$inferSelect): PatientProfileOut {
    return {
      id: row.id,
      userId: row.userId,
      dob: row.dob,
      // Older rows may hold lower-case values ('female'); the contract is upper-case.
      gender: row.gender.toUpperCase() as PatientProfileOut['gender'],
      bloodGroup: row.bloodGroup ?? undefined,
      heightCm: row.heightCm ?? undefined,
      weightKg: row.weightKg ?? undefined,
      address: row.address ?? undefined,
      emergencyContactName: row.emergencyContactName ?? undefined,
      emergencyContactPhone: row.emergencyContactPhone ?? undefined,
      allergies: row.allergies,
      chronicConditions: row.chronicConditions,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toDoctorOut(row: typeof doctorProfiles.$inferSelect): DoctorProfileOut {
    return {
      id: row.id,
      userId: row.userId,
      medicalCouncil: row.medicalCouncil,
      registrationNumber: row.registrationNumber,
      specializations: row.specializations,
      qualifications: row.qualifications,
      yearsExperience: row.yearsExperience,
      bio: row.bio ?? undefined,
      consultationFeeInr: row.consultationFeeInr,
      clinicName: row.clinicName ?? undefined,
      clinicAddress: row.clinicAddress ?? undefined,
      clinicMapUrl: row.clinicMapUrl ?? undefined,
      clinicPhone: row.clinicPhone ?? undefined,
      favoriteMedicines: row.favoriteMedicines ?? [],
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
