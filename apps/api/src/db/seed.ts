import bcrypt from 'bcryptjs';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';

import connectionOptions from './config/database.config';
import {
  appointments,
  availabilityRules,
  chatThreads,
  doctorProfiles,
  patientProfiles,
  prescriptions,
  users,
} from './schema';

/**
 * Demo fixture: 2 verified doctors + 5 patients, each with appointments
 * (one past COMPLETED and one upcoming CONFIRMED per patient → 10 total),
 * plus a chat thread per appointment and Mon–Fri availability for each doctor.
 *
 * Uses the same connection wiring as the migrator (pg + database.config.ts).
 * Idempotent on the seeded emails; wipes and re-creates only the seeded users'
 * appointments on re-run. Dev only — refuses NODE_ENV=production.
 *
 *   npm run seed:run --workspace @carelink/api
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'password123';
const HOUR = 3_600_000;
const DAY = 86_400_000;

const DOCTORS = [
  {
    email: 'doctor.test@gmail.com',
    fullName: 'Dr. Doctor Test',
    medicalCouncil: 'Tamil Nadu Medical Council',
    registrationNumber: 'TNMC-2001',
    qualifications: 'MBBS, MD (General Medicine), DM (Cardiology)',
    specializations: ['Cardiology', 'General Medicine'],
    yearsExperience: 12,
    consultationFeeInr: 800,
    bio: 'Consultant cardiologist — heart-failure and preventive cardiology clinic.',
    clinicName: 'CareLink Heart Clinic',
  },
  {
    email: 'doctor.test2@gmail.com',
    fullName: 'Dr. Doctor Test2',
    medicalCouncil: 'Tamil Nadu Medical Council',
    registrationNumber: 'TNMC-2002',
    qualifications: 'MBBS, MD (Dermatology)',
    specializations: ['Dermatology'],
    yearsExperience: 7,
    consultationFeeInr: 500,
    bio: 'Skin, hair and nail disorders; teledermatology follow-ups.',
    clinicName: null,
  },
];

const PATIENTS = [
  { email: 'priya.nair@example.com', fullName: 'Priya Nair', dob: '1992-04-18', gender: 'FEMALE', bloodGroup: 'O+' },
  { email: 'rahul.verma@example.com', fullName: 'Rahul Verma', dob: '1985-11-02', gender: 'MALE', bloodGroup: 'B+' },
  { email: 'sara.khan@example.com', fullName: 'Sara Khan', dob: '1998-07-27', gender: 'FEMALE', bloodGroup: 'A+' },
  { email: 'vikram.rao@example.com', fullName: 'Vikram Rao', dob: '1979-01-09', gender: 'MALE', bloodGroup: 'AB+' },
  { email: 'meera.iyer@example.com', fullName: 'Meera Iyer', dob: '2001-09-14', gender: 'FEMALE', bloodGroup: 'O-' },
];

const REASONS = [
  'Follow-up consultation',
  'Persistent cough for two weeks',
  'Review of recent lab reports',
  'Skin rash assessment',
  'Routine health check',
];

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('refusing to run the demo seed with NODE_ENV=production');
  }

  const connection = new Client(connectionOptions);
  await connection.connect();
  const db = drizzle(connection);

  try {
    const now = Date.now();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const verifiedAt = new Date();

    // ---- doctors + availability ----
    const doctorIds: string[] = [];
    for (const d of DOCTORS) {
      const [u] = await db
        .insert(users)
        .values({
          email: d.email,
          passwordHash,
          fullName: d.fullName,
          role: 'DOCTOR',
          emailVerifiedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { passwordHash, fullName: d.fullName, role: 'DOCTOR', emailVerifiedAt: verifiedAt },
        })
        .returning();

      const [profile] = await db
        .insert(doctorProfiles)
        .values({
          userId: u.id,
          medicalCouncil: d.medicalCouncil,
          registrationNumber: d.registrationNumber,
          qualifications: d.qualifications,
          specializations: d.specializations,
          yearsExperience: d.yearsExperience,
          consultationFeeInr: d.consultationFeeInr,
          bio: d.bio,
          clinicName: d.clinicName,
          verifiedAt,
        })
        .onConflictDoUpdate({
          target: doctorProfiles.userId,
          set: {
            specializations: d.specializations,
            consultationFeeInr: d.consultationFeeInr,
            verifiedAt,
          },
        })
        .returning();

      await db.delete(availabilityRules).where(eq(availabilityRules.doctorId, profile.id));
      await db.insert(availabilityRules).values(
        [1, 2, 3, 4, 5].map((weekday) => ({
          doctorId: profile.id,
          weekday,
          startTime: '09:00',
          endTime: '17:00',
          slotMinutes: 30,
          effectiveFrom: '2024-01-01',
        })),
      );

      doctorIds.push(u.id);
    }

    // ---- patients ----
    const patientIds: string[] = [];
    for (const p of PATIENTS) {
      const [u] = await db
        .insert(users)
        .values({
          email: p.email,
          passwordHash,
          fullName: p.fullName,
          role: 'PATIENT',
          emailVerifiedAt: verifiedAt,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { passwordHash, fullName: p.fullName, emailVerifiedAt: verifiedAt },
        })
        .returning();

      await db
        .insert(patientProfiles)
        .values({ userId: u.id, dob: p.dob, gender: p.gender, bloodGroup: p.bloodGroup })
        .onConflictDoUpdate({
          target: patientProfiles.userId,
          set: { dob: p.dob, gender: p.gender, bloodGroup: p.bloodGroup },
        });

      patientIds.push(u.id);
    }

    // ---- reset the seeded patients' appointments (chat_threads/video_sessions
    //      cascade; prescriptions have no cascade so clear them first) ----
    const stale = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(inArray(appointments.patientId, patientIds));
    const staleIds = stale.map((a) => a.id);
    if (staleIds.length) {
      await db.delete(prescriptions).where(inArray(prescriptions.appointmentId, staleIds));
      await db.delete(appointments).where(inArray(appointments.id, staleIds));
    }

    // ---- appointments: one past + one upcoming per patient ----
    let created = 0;
    for (let i = 0; i < patientIds.length; i++) {
      const patientId = patientIds[i];
      const pastStart = new Date(now - (i + 3) * DAY - 2 * HOUR);
      const upcomingStart = new Date(now + (i + 1) * DAY + 3 * HOUR);

      const slots = [
        {
          doctorId: doctorIds[i % doctorIds.length],
          start: pastStart,
          status: 'COMPLETED' as const,
          reason: REASONS[i % REASONS.length],
        },
        {
          doctorId: doctorIds[(i + 1) % doctorIds.length],
          start: upcomingStart,
          status: 'CONFIRMED' as const,
          reason: REASONS[(i + 2) % REASONS.length],
        },
      ];

      for (const s of slots) {
        const end = new Date(s.start.getTime() + 30 * 60_000);
        const [appt] = await db
          .insert(appointments)
          .values({
            patientId,
            doctorId: s.doctorId,
            scheduledStart: s.start,
            scheduledEnd: end,
            status: s.status,
            reasonForVisit: s.reason,
            consentAcceptedAt: s.start,
          })
          .returning();

        await db.insert(chatThreads).values({
          appointmentId: appt.id,
          opensAt: new Date(s.start.getTime() - 15 * 60_000),
          closesAt: new Date(end.getTime() + 7 * DAY),
        });
        created++;
      }
    }

    console.log('seed complete (password: %s)', PASSWORD);
    console.table([
      ...DOCTORS.map((d) => ({ role: 'DOCTOR', email: d.email })),
      ...PATIENTS.map((p) => ({ role: 'PATIENT', email: p.email })),
    ]);
    console.log('appointments created:', created);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
