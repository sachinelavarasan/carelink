import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getDb } from './index';
import { doctorProfiles, users } from './schema';

/**
 * Local-dev convenience: creates a pre-verified patient and doctor so you can log
 * in without going through email verification. Idempotent. NEVER run against prod.
 *
 *   npm run db:seed:test --workspace @carelink/api
 */
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password123';

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('refusing to seed test users with NODE_ENV=production');
  }

  const db = getDb();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  const [patient] = await db
    .insert(users)
    .values({
      email: 'patient@test.local',
      passwordHash,
      fullName: 'Test Patient',
      role: 'PATIENT',
      emailVerifiedAt: now,
    })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash, emailVerifiedAt: now } })
    .returning();

  const [doctor] = await db
    .insert(users)
    .values({
      email: 'doctor@test.local',
      passwordHash,
      fullName: 'Dr. Test',
      role: 'DOCTOR',
      emailVerifiedAt: now,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash, role: 'DOCTOR', emailVerifiedAt: now },
    })
    .returning();

  await db
    .insert(doctorProfiles)
    .values({
      userId: doctor.id,
      medicalCouncil: 'Tamil Nadu Medical Council',
      registrationNumber: 'TNMC-TEST-1',
      qualifications: 'MBBS, MD',
      specializations: ['General Medicine'],
      yearsExperience: 8,
      consultationFeeInr: 300,
      verifiedAt: now,
    })
    .onConflictDoUpdate({ target: doctorProfiles.userId, set: { verifiedAt: now } });

  console.log('seeded test users (password: %s)', PASSWORD);
  console.table([
    { email: patient.email, role: patient.role },
    { email: doctor.email, role: doctor.role },
  ]);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
