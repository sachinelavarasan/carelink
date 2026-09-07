import 'dotenv/config';
import { and, eq } from 'drizzle-orm';
import { getDb } from './index';
import { appointments, chatThreads, doctorProfiles, users, videoSessions } from './schema';

/**
 * Local-only: ensures the two test users exist as PATIENT/DOCTOR and gives them a
 * CONFIRMED appointment that is *in progress right now* (so it shows under the
 * "Upcoming" tab with an "Open consultation" link) and whose chat window is OPEN.
 * Prints the ids as JSON. NEVER run against prod.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('refusing: NODE_ENV=production');
  const db = getDb();

  const patient = await db.query.users.findFirst({ where: eq(users.email, 'patient@test.local') });
  const doctor = await db.query.users.findFirst({ where: eq(users.email, 'doctor@test.local') });
  if (!patient || !doctor) throw new Error('run `npm run db:seed:test` first');

  await db
    .update(doctorProfiles)
    .set({ verifiedAt: new Date() })
    .where(eq(doctorProfiles.userId, doctor.id));

  const now = Date.now();
  // In progress: started 30 min ago, ends in 30 min → lands in the "upcoming"
  // list (scheduledEnd >= now, CONFIRMED) so the consult link renders.
  const start = new Date(now - 30 * 60_000);
  const end = new Date(now + 30 * 60_000);

  const existing = await db.query.appointments.findFirst({
    where: and(
      eq(appointments.patientId, patient.id),
      eq(appointments.doctorId, doctor.id),
      eq(appointments.reasonForVisit, 'Consult page smoke test'),
    ),
  });

  let appointmentId = existing?.id;
  if (!appointmentId) {
    const [row] = await db
      .insert(appointments)
      .values({
        patientId: patient.id,
        doctorId: doctor.id,
        scheduledStart: start,
        scheduledEnd: end,
        status: 'CONFIRMED',
        reasonForVisit: 'Consult page smoke test',
        consentAcceptedAt: new Date(),
      })
      .returning();
    appointmentId = row.id;
  } else {
    // Re-running: slide the window to "now" so it stays in the upcoming list.
    await db
      .update(appointments)
      .set({ scheduledStart: start, scheduledEnd: end, status: 'CONFIRMED' })
      .where(eq(appointments.id, appointmentId));
  }

  let thread = await db.query.chatThreads.findFirst({
    where: eq(chatThreads.appointmentId, appointmentId),
  });
  if (!thread) {
    const [row] = await db
      .insert(chatThreads)
      .values({
        appointmentId,
        opensAt: start,
        closesAt: new Date(now + 7 * 86_400_000),
      })
      .returning();
    thread = row;
  } else {
    await db
      .update(chatThreads)
      .set({ opensAt: start, closesAt: new Date(now + 7 * 86_400_000) })
      .where(eq(chatThreads.id, thread.id));
  }

  // Clear any prior video session so the call is joinable again on re-run.
  await db.delete(videoSessions).where(eq(videoSessions.appointmentId, appointmentId));

  console.log(
    JSON.stringify(
      { patientId: patient.id, doctorId: doctor.id, appointmentId, threadId: thread.id },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
