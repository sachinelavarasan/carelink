import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { doctorProfiles, users } from './schema';

/**
 * Seeds the single verified doctor account (see docs/PLAN.md §7, §15).
 *
 *   DOCTOR_EMAIL=... DOCTOR_PASSWORD=... npm run db:seed --workspace @carelink/api
 */
async function main(): Promise<void> {
  const email = requireEnv('DOCTOR_EMAIL').toLowerCase();
  const password = requireEnv('DOCTOR_PASSWORD');
  const fullName = process.env.DOCTOR_NAME ?? 'Dr. CareLink';
  const passwordHash = await bcrypt.hash(password, 12);

  const db = getDb();

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash, fullName, role: 'DOCTOR', emailVerifiedAt: new Date() })
    .onConflictDoUpdate({
      target: users.email,
      set: { role: 'DOCTOR', fullName, passwordHash, emailVerifiedAt: new Date() },
    })
    .returning();

  await db
    .insert(doctorProfiles)
    .values({
      userId: user.id,
      medicalCouncil: process.env.DOCTOR_COUNCIL ?? 'Tamil Nadu Medical Council',
      registrationNumber: process.env.DOCTOR_REG_NO ?? 'TNMC-00000',
      qualifications: process.env.DOCTOR_QUALIFICATIONS ?? 'MBBS',
      specializations: (process.env.DOCTOR_SPECIALIZATIONS ?? 'General Medicine').split(','),
      yearsExperience: Number(process.env.DOCTOR_YEARS ?? 0),
      consultationFeeInr: Number(process.env.DOCTOR_FEE_INR ?? 0),
      verifiedAt: new Date(),
    })
    .onConflictDoUpdate({ target: doctorProfiles.userId, set: { verifiedAt: new Date() } });

  const seeded = await db.query.users.findFirst({
    where: eq(users.id, user.id),
    with: { doctorProfile: true },
  });
  console.log('seeded doctor:', { id: seeded?.id, email: seeded?.email, role: seeded?.role });
  process.exit(0);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
