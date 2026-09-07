import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { eq, or } from 'drizzle-orm';
import type {
  DoctorProfileInput,
  DoctorProfileOut,
  Me,
  PatientProfileInput,
  PatientProfileOut,
} from '@carelink/shared';
import { DB } from '../db/db.module';
import type { Database } from '../db';
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
  constructor(@Inject(DB) private readonly db: Database) {}

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
      // Cascades: auth_tokens, patient/doctor profiles (→ availability_*),
      // notifications, push_tokens, any remaining medical_documents by patientId.
      await tx.delete(users).where(eq(users.id, userId));
    });

    return { ok: true };
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
      gender: row.gender as PatientProfileOut['gender'],
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
      verifiedAt: row.verifiedAt ? row.verifiedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
