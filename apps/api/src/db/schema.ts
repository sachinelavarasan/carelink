// CareLink data model (Drizzle) — see docs/PLAN.md §6
import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['PATIENT', 'DOCTOR', 'ADMIN']);
export const appointmentStatus = pgEnum('appointment_status', [
  'REQUESTED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
]);
export const documentKind = pgEnum('document_kind', ['LAB_REPORT', 'SCAN', 'OTHER']);
export const notificationChannel = pgEnum('notification_channel', ['PUSH', 'EMAIL']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: userRole('role').notNull().default('PATIENT'),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    phone: text('phone'),
    fullName: text('full_name').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

// Email-verification and password-reset links are stateless JWTs — no table.

export const patientProfiles = pgTable('patient_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  dob: date('dob').notNull(),
  gender: text('gender').notNull(),
  bloodGroup: text('blood_group'),
  heightCm: doublePrecision('height_cm'),
  weightKg: doublePrecision('weight_kg'),
  address: text('address'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  allergies: text('allergies').array().notNull().default([]),
  chronicConditions: text('chronic_conditions').array().notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const doctorProfiles = pgTable(
  'doctor_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    medicalCouncil: text('medical_council').notNull(),
    registrationNumber: text('registration_number').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    specializations: text('specializations').array().notNull().default([]),
    qualifications: text('qualifications').notNull(),
    yearsExperience: integer('years_experience').notNull().default(0),
    bio: text('bio'),
    consultationFeeInr: integer('consultation_fee_inr').notNull().default(0),
    clinicName: text('clinic_name'),
    clinicAddress: text('clinic_address'),
    clinicMapUrl: text('clinic_map_url'), // Google/Apple Maps link, shown to patients as "Get directions"
    clinicPhone: text('clinic_phone'),
    favoriteMedicines: jsonb('favorite_medicines')
      .notNull()
      .default([])
      .$type<
        {
          drugName: string;
          strength?: string;
          form?: string;
          frequency: string;
          durationDays: number;
          instructions?: string;
        }[]
      >(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    regIdx: uniqueIndex('doctor_registration_idx').on(t.medicalCouncil, t.registrationNumber),
  }),
);

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(), // 0 = Sunday .. 6 = Saturday
    startTime: text('start_time').notNull(), // "HH:mm"
    endTime: text('end_time').notNull(), // "HH:mm"
    slotMinutes: integer('slot_minutes').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
  },
  (t) => ({
    byDoctorWeekday: index('availability_rules_doctor_weekday_idx').on(t.doctorId, t.weekday),
  }),
);

export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    isClosed: boolean('is_closed').notNull().default(true),
    startTime: text('start_time'),
    endTime: text('end_time'),
  },
  (t) => ({
    byDoctorDate: uniqueIndex('availability_exceptions_doctor_date_idx').on(t.doctorId, t.date),
  }),
);

export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => users.id),
    doctorId: uuid('doctor_id')
      .notNull()
      .references(() => users.id),
    scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
    scheduledEnd: timestamp('scheduled_end', { withTimezone: true }).notNull(),
    status: appointmentStatus('status').notNull().default('CONFIRMED'),
    reasonForVisit: text('reason_for_visit').notNull(),
    consentAcceptedAt: timestamp('consent_accepted_at', { withTimezone: true }),
    identityVerifiedAt: timestamp('identity_verified_at', { withTimezone: true }),
    cancelledBy: uuid('cancelled_by'),
    cancelReason: text('cancel_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byDoctorStart: index('appointments_doctor_start_idx').on(t.doctorId, t.scheduledStart),
    byPatientStart: index('appointments_patient_start_idx').on(t.patientId, t.scheduledStart),
  }),
);

export const chatThreads = pgTable('chat_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  opensAt: timestamp('opens_at', { withTimezone: true }).notNull(),
  closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
});

/** One Jitsi room per appointment. Created lazily when someone opens the video
 *  page; `roomName` is unguessable and only handed to authenticated participants. */
export const videoSessions = pgTable('video_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id, { onDelete: 'cascade' }),
  roomName: text('room_name').notNull().unique(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => chatThreads.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body').notNull(),
    attachmentKey: text('attachment_key'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    byThreadSent: index('messages_thread_sent_idx').on(t.threadId, t.sentAt),
  }),
);

export const prescriptions = pgTable('prescriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  appointmentId: uuid('appointment_id')
    .notNull()
    .unique()
    .references(() => appointments.id),
  doctorId: uuid('doctor_id').notNull(),
  patientId: uuid('patient_id').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  // Null while the prescription is a draft; set when the doctor finalises it
  // (PDF rendered, appointment marked COMPLETED, patient notified).
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  symptoms: text('symptoms'),
  diagnosis: text('diagnosis').notNull(),
  advice: text('advice'),
  notes: text('notes'), // doctor-only clinical notes; never returned to the patient
  followUpDate: date('follow_up_date'),
  pdfKey: text('pdf_key'), // Cloudinary public_id once uploaded
  drugCategoryFlags: text('drug_category_flags').array().notNull().default([]),
});

export const prescriptionItems = pgTable('prescription_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  prescriptionId: uuid('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0), // display order within the prescription
  drugName: text('drug_name').notNull(),
  strength: text('strength'),
  form: text('form'),
  frequency: text('frequency').notNull(),
  durationDays: integer('duration_days').notNull(),
  instructions: text('instructions'),
});

export const medicalDocuments = pgTable(
  'medical_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    uploadedById: uuid('uploaded_by_id')
      .notNull()
      .references(() => users.id),
    kind: documentKind('kind').notNull(),
    title: text('title').notNull(),
    fileKey: text('file_key').notNull(),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byPatientUploaded: index('medical_documents_patient_uploaded_idx').on(t.patientId, t.uploadedAt),
  }),
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    payloadJson: jsonb('payload_json').notNull(),
    channel: notificationChannel('channel').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dueIdx: index('notifications_due_idx').on(t.sentAt, t.scheduledFor),
  }),
);

export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  platform: text('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byEntity: index('audit_logs_entity_idx').on(t.entityType, t.entityId),
    byActor: index('audit_logs_actor_idx').on(t.actorUserId, t.createdAt),
  }),
);

/* ------------------------------------------------------------------ relations */

export const usersRelations = relations(users, ({ one, many }) => ({
  patientProfile: one(patientProfiles, {
    fields: [users.id],
    references: [patientProfiles.userId],
  }),
  doctorProfile: one(doctorProfiles, {
    fields: [users.id],
    references: [doctorProfiles.userId],
  }),
  patientAppointments: many(appointments, { relationName: 'patientAppointments' }),
  doctorAppointments: many(appointments, { relationName: 'doctorAppointments' }),
}));

export const doctorProfilesRelations = relations(doctorProfiles, ({ one, many }) => ({
  user: one(users, { fields: [doctorProfiles.userId], references: [users.id] }),
  availabilityRules: many(availabilityRules),
  availabilityExceptions: many(availabilityExceptions),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(users, {
    fields: [appointments.patientId],
    references: [users.id],
    relationName: 'patientAppointments',
  }),
  doctor: one(users, {
    fields: [appointments.doctorId],
    references: [users.id],
    relationName: 'doctorAppointments',
  }),
  chatThread: one(chatThreads, {
    fields: [appointments.id],
    references: [chatThreads.appointmentId],
  }),
  videoSession: one(videoSessions, {
    fields: [appointments.id],
    references: [videoSessions.appointmentId],
  }),
  prescription: one(prescriptions, {
    fields: [appointments.id],
    references: [prescriptions.appointmentId],
  }),
}));

export const videoSessionsRelations = relations(videoSessions, ({ one }) => ({
  appointment: one(appointments, {
    fields: [videoSessions.appointmentId],
    references: [appointments.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [chatThreads.appointmentId],
    references: [appointments.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(chatThreads, { fields: [messages.threadId], references: [chatThreads.id] }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
  items: many(prescriptionItems),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionItems.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export type DbSchema = {
  users: typeof users;
  patientProfiles: typeof patientProfiles;
  doctorProfiles: typeof doctorProfiles;
  availabilityRules: typeof availabilityRules;
  availabilityExceptions: typeof availabilityExceptions;
  appointments: typeof appointments;
  chatThreads: typeof chatThreads;
  videoSessions: typeof videoSessions;
  messages: typeof messages;
  prescriptions: typeof prescriptions;
  prescriptionItems: typeof prescriptionItems;
  medicalDocuments: typeof medicalDocuments;
  notifications: typeof notifications;
  pushTokens: typeof pushTokens;
  auditLogs: typeof auditLogs;
};
