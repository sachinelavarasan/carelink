import { z } from 'zod';
import {
  AppointmentStatus,
  DocumentKind,
  DrugCategoryFlag,
  IntakeSeverity,
  UserRole,
} from './enums';

const isoDate = z.string().datetime({ offset: true });
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:mm');
const cuid = z.string().min(1);

/** One prescribable medicine line — shared by prescription items and a
 *  doctor's saved "regular medicines". */
export const medicineItemSchema = z.object({
  drugName: z.string().trim().min(1).max(200),
  strength: z.string().trim().max(60).optional(),
  form: z.string().trim().max(60).optional(),
  frequency: z.string().trim().min(1).max(120),
  durationDays: z.number().int().min(1).max(365),
  instructions: z.string().trim().max(500).optional(),
});
export type MedicineItem = z.infer<typeof medicineItemSchema>;

/* ------------------------------------------------------------------ users */

export const userSchema = z.object({
  id: cuid,
  role: z.nativeEnum(UserRole),
  email: z.string().email(),
  phone: z.string().nullable(),
  fullName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
});
export type User = z.infer<typeof userSchema>;

/* ------------------------------------------------------------------- auth */

const emailField = z.string().trim().toLowerCase().email();
const passwordField = z.string().min(8, 'at least 8 characters').max(100);

export const registerSchema = z.object({
  email: emailField,
  password: passwordField,
  fullName: z.string().trim().min(2).max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** Edit the account's own name / phone (`PATCH /me`). */
export const updateAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(20).optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailQuerySchema = z.object({ token: z.string().min(1) });

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordField,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** Login response — a single access token, no refresh. */
export const authTokensSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int().positive(), // seconds
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const okSchema = z.object({ ok: z.literal(true) });

export const patientProfileSchema = z.object({
  dob: z.string().date(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  bloodGroup: z.string().max(3).optional(),
  heightCm: z.number().positive().optional(),
  weightKg: z.number().positive().optional(),
  address: z.string().max(500).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
});
export type PatientProfileInput = z.infer<typeof patientProfileSchema>;

export const doctorProfileSchema = z.object({
  medicalCouncil: z.string().min(2),
  registrationNumber: z.string().min(2),
  specializations: z.array(z.string()).min(1),
  qualifications: z.string().min(2),
  yearsExperience: z.number().int().nonnegative(),
  bio: z.string().max(2000).optional(),
  consultationFeeInr: z.number().int().nonnegative(),
  clinicName: z.string().max(200).optional(),
  clinicAddress: z.string().max(500).optional(),
  clinicMapUrl: z.string().url().max(2000).optional(),
  clinicPhone: z.string().max(20).optional(),
  /** Reusable medicine lines the doctor can drop into a prescription. */
  favoriteMedicines: z.array(medicineItemSchema).max(50).default([]),
});
export type DoctorProfileInput = z.infer<typeof doctorProfileSchema>;

/* ----------------------------------------------------------- availability */

export const availabilityRuleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: hhmm,
  endTime: hhmm,
  slotMinutes: z.number().int().min(5).max(120),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().nullable().optional(),
});
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;

export const availabilityExceptionSchema = z.object({
  date: z.string().date(),
  isClosed: z.boolean(),
  startTime: hhmm.optional(),
  endTime: hhmm.optional(),
});
export type AvailabilityExceptionInput = z.infer<typeof availabilityExceptionSchema>;

/** Close (or set custom hours for) every date in an inclusive range — a
 *  holiday / leave block. The API expands it to one exception row per date. */
export const availabilityExceptionRangeSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
    isClosed: z.boolean().default(true),
    startTime: hhmm.optional(),
    endTime: hhmm.optional(),
  })
  .refine((v) => v.to >= v.from, { message: '`to` must be on or after `from`', path: ['to'] });
export type AvailabilityExceptionRangeInput = z.infer<typeof availabilityExceptionRangeSchema>;

/** Query for clearing a whole block of date overrides at once. */
export const availabilityExceptionRangeQuerySchema = z
  .object({ from: z.string().date(), to: z.string().date() })
  .refine((v) => v.to >= v.from, { message: '`to` must be on or after `from`', path: ['to'] });
export type AvailabilityExceptionRangeQuery = z.infer<typeof availabilityExceptionRangeQuerySchema>;

export const slotSchema = z.object({
  start: isoDate,
  end: isoDate,
});
export type Slot = z.infer<typeof slotSchema>;

/** Replace the doctor's whole weekly template in one call. */
export const replaceAvailabilityRulesSchema = z.object({
  rules: z.array(availabilityRuleSchema).max(50),
});
export type ReplaceAvailabilityRulesInput = z.infer<typeof replaceAvailabilityRulesSchema>;

export const slotQuerySchema = z.object({
  from: z.string().date(),
  to: z.string().date(),
});
export type SlotQuery = z.infer<typeof slotQuerySchema>;

export const availabilityRuleOutSchema = availabilityRuleSchema.extend({ id: cuid });
export type AvailabilityRuleOut = z.infer<typeof availabilityRuleOutSchema>;

export const availabilityExceptionOutSchema = availabilityExceptionSchema.extend({ id: cuid });
export type AvailabilityExceptionOut = z.infer<typeof availabilityExceptionOutSchema>;

/* ---------------------------------------------------------------- doctors */

export const doctorPublicSchema = z.object({
  id: cuid,
  fullName: z.string(),
  specializations: z.array(z.string()),
  qualifications: z.string(),
  yearsExperience: z.number().int(),
  bio: z.string().nullable(),
  consultationFeeInr: z.number().int(),
  clinicName: z.string().nullable(),
  clinicAddress: z.string().nullable(),
  clinicMapUrl: z.string().nullable(),
  clinicPhone: z.string().nullable(),
});
export type DoctorPublic = z.infer<typeof doctorPublicSchema>;

export const doctorSortSchema = z.enum(['name', 'fee', 'experience']).default('name');
export type DoctorSort = z.infer<typeof doctorSortSchema>;

/** Query for the patient-facing doctor directory. */
export const listDoctorsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  specialization: z.string().trim().max(120).optional(),
  sort: doctorSortSchema,
});
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>;

/** A doctor the patient has already consulted — for quick re-booking. */
export const visitedDoctorSchema = doctorPublicSchema.extend({
  lastVisitedAt: isoDate,
  visitCount: z.number().int().positive(),
});
export type VisitedDoctor = z.infer<typeof visitedDoctorSchema>;

/** A patient a doctor has consulted — for the doctor's patient list. */
export const visitedPatientSchema = z.object({
  id: cuid,
  fullName: z.string(),
  dob: z.string().date().nullable(),
  gender: z.string().nullable(),
  lastVisitedAt: isoDate,
  visitCount: z.number().int().positive(),
});
export type VisitedPatient = z.infer<typeof visitedPatientSchema>;

/* ------------------------------------------------------------ appointments */

export const createAppointmentSchema = z.object({
  doctorId: cuid,
  scheduledStart: isoDate,
  reasonForVisit: z.string().trim().min(3).max(1000),
  consentAccepted: z.literal(true, {
    errorMap: () => ({ message: 'teleconsultation consent is required' }),
  }),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const cancelAppointmentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const rescheduleAppointmentSchema = z.object({
  scheduledStart: isoDate,
});
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
  scope: z.enum(['upcoming', 'past', 'all']).default('upcoming'),
  status: z.nativeEnum(AppointmentStatus).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const appointmentSchema = z.object({
  id: cuid,
  patientId: cuid,
  doctorId: cuid,
  scheduledStart: isoDate,
  scheduledEnd: isoDate,
  status: z.nativeEnum(AppointmentStatus),
  reasonForVisit: z.string(),
  consentAcceptedAt: isoDate.nullable(),
  identityVerifiedAt: isoDate.nullable(),
  cancelledBy: cuid.nullable(),
  cancelReason: z.string().nullable(),
  createdAt: isoDate,
});
export type Appointment = z.infer<typeof appointmentSchema>;

/** Appointment plus the other party's display name, for list views. */
export const appointmentListItemSchema = appointmentSchema.extend({
  counterpartyName: z.string(),
  chatThreadId: cuid.nullable(),
});
export type AppointmentListItem = z.infer<typeof appointmentListItemSchema>;

export const appointmentPageSchema = z.object({
  items: z.array(appointmentListItemSchema),
  nextCursor: z.string().nullable(),
});
export type AppointmentPage = z.infer<typeof appointmentPageSchema>;

/** Home-page summary: three counts, a 14-day daily series, and a lifetime
 *  status breakdown (used by the doctor dashboard). */
export const appointmentSummarySchema = z.object({
  today: z.number().int().nonnegative(), // non-cancelled appointments dated today (clinic tz)
  upcoming: z.number().int().nonnegative(),
  next7Days: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  daily: z.array(z.object({ date: z.string().date(), count: z.number().int().nonnegative() })),
  byStatus: z.object({
    REQUESTED: z.number().int().nonnegative(),
    CONFIRMED: z.number().int().nonnegative(),
    CANCELLED: z.number().int().nonnegative(),
    COMPLETED: z.number().int().nonnegative(),
    NO_SHOW: z.number().int().nonnegative(),
  }),
  patientsSeen: z.number().int().nonnegative(), // doctor: distinct patients on COMPLETED visits
  counterpartiesSeen: z.number().int().nonnegative(), // distinct other party over non-cancelled
  followUpsDue: z.number().int().nonnegative(), // patient: finalised Rx with a follow-up in the next 14 days
  pendingRecords: z.number().int().nonnegative(), // doctor: own prescriptions still in draft
});
export type AppointmentSummary = z.infer<typeof appointmentSummarySchema>;

/* ---------------------------------------------------- pre-consultation intake */

/** The patient's short questionnaire attached to an appointment. All fields but
 *  the chief complaint are optional; the patient edits it up to the consult. */
export const appointmentIntakeSchema = z.object({
  chiefComplaint: z.string().trim().min(3).max(1000),
  symptomsStarted: z.string().trim().max(200).optional(),
  severity: z.nativeEnum(IntakeSeverity).optional(),
  currentMedications: z.string().trim().max(2000).optional(),
  allergies: z.string().trim().max(1000).optional(),
  additionalNotes: z.string().trim().max(2000).optional(),
});
export type AppointmentIntakeInput = z.infer<typeof appointmentIntakeSchema>;

export const appointmentIntakeViewSchema = appointmentIntakeSchema.extend({
  appointmentId: cuid,
  updatedAt: isoDate,
});
export type AppointmentIntakeView = z.infer<typeof appointmentIntakeViewSchema>;

/* ------------------------------------------------------------------- vitals */

/** The measurement fields on a vitals reading — at least one must be present. */
const vitalMeasurements = {
  weightKg: z.number().positive().max(500).optional(),
  systolic: z.number().int().min(40).max(300).optional(),
  diastolic: z.number().int().min(20).max(200).optional(),
  heartRate: z.number().int().min(20).max(300).optional(),
  bloodSugarMgDl: z.number().positive().max(2000).optional(),
  temperatureC: z.number().min(30).max(45).optional(),
};
const VITAL_KEYS = Object.keys(vitalMeasurements) as (keyof typeof vitalMeasurements)[];

export const vitalEntrySchema = z
  .object({
    ...vitalMeasurements,
    recordedAt: isoDate.optional(), // defaults to "now" on the server
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => VITAL_KEYS.some((k) => v[k] != null), {
    message: 'record at least one measurement',
  });
export type VitalEntryInput = z.infer<typeof vitalEntrySchema>;

export const vitalSchema = z.object({
  id: cuid,
  recordedAt: isoDate,
  weightKg: z.number().nullable(),
  systolic: z.number().int().nullable(),
  diastolic: z.number().int().nullable(),
  heartRate: z.number().int().nullable(),
  bloodSugarMgDl: z.number().nullable(),
  temperatureC: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: isoDate,
});
export type Vital = z.infer<typeof vitalSchema>;

export const vitalsListSchema = z.object({ items: z.array(vitalSchema) });
export type VitalsList = z.infer<typeof vitalsListSchema>;

/* --------------------------------------------------------------- push tokens */

export const registerPushTokenSchema = z.object({
  token: z.string().min(1).max(300),
  platform: z.enum(['ios', 'android', 'web']),
});
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;

/* ------------------------------------------------------- account deletion */

/** DPDP erasure. Hard delete — requires the password and a typed confirmation. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1),
  confirm: z.literal('DELETE'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;

/* -------------------------------------------------------------------- chat */

export const sendMessageSchema = z.object({
  threadId: cuid,
  body: z.string().trim().min(1).max(4000),
  attachmentKey: z.string().max(300).optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const messageSchema = z.object({
  id: cuid,
  threadId: cuid,
  senderId: cuid,
  body: z.string(),
  attachmentKey: z.string().nullable(),
  sentAt: isoDate,
  readAt: isoDate.nullable(),
});
export type Message = z.infer<typeof messageSchema>;

export const threadMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});
export type ThreadMessagesQuery = z.infer<typeof threadMessagesQuerySchema>;

export const messagesPageSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});
export type MessagesPage = z.infer<typeof messagesPageSchema>;

/** PENDING before opensAt · OPEN in the window · CLOSED after closesAt. */
export const threadStateSchema = z.enum(['PENDING', 'OPEN', 'CLOSED']);
export type ThreadState = z.infer<typeof threadStateSchema>;

/** One call that gives the consult page everything it needs for the header. */
export const threadViewSchema = z.object({
  id: cuid,
  appointmentId: cuid,
  opensAt: isoDate,
  closesAt: isoDate,
  state: threadStateSchema,
  viewerRole: z.enum(['PATIENT', 'DOCTOR']),
  counterpartyId: cuid,
  counterpartyName: z.string(),
  reasonForVisit: z.string(),
  consentAcceptedAt: isoDate.nullable(),
  identityVerifiedAt: isoDate.nullable(),
});
export type ThreadView = z.infer<typeof threadViewSchema>;

/* --------------------------------------------------------------- video call */

/** PENDING before anyone joins · LIVE once started · ENDED after it closes. */
export const videoStateSchema = z.enum(['PENDING', 'LIVE', 'ENDED']);
export type VideoState = z.infer<typeof videoStateSchema>;

export const videoSessionSchema = z.object({
  appointmentId: cuid,
  domain: z.string(), // Jitsi domain, e.g. "meet.jit.si"
  roomName: z.string(),
  joinUrl: z.string().url(),
  state: videoStateSchema,
  /** Within the join window (scheduledStart − 5 min … scheduledEnd + 30 min),
   *  appointment CONFIRMED, and not already ended. */
  canJoin: z.boolean(),
  windowOpensAt: isoDate,
  windowClosesAt: isoDate,
  startedAt: isoDate.nullable(),
  endedAt: isoDate.nullable(),
});
export type VideoSession = z.infer<typeof videoSessionSchema>;

/* ----------------------------------------------------------- prescriptions */

export const prescriptionItemSchema = medicineItemSchema;
export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;

/** The doctor's consultation record for one appointment. Created as a DRAFT;
 *  finalising renders the PDF and flips the appointment to COMPLETED. */
export const prescriptionBodySchema = z.object({
  symptoms: z.string().trim().max(2000).optional(),
  diagnosis: z.string().trim().min(2).max(2000),
  advice: z.string().trim().max(4000).optional(),
  notes: z.string().trim().max(4000).optional(), // doctor-only, never sent to the patient
  followUpDate: z.string().date().optional(),
  drugCategoryFlags: z.array(z.nativeEnum(DrugCategoryFlag)).default([]),
  items: z.array(prescriptionItemSchema).min(1).max(30),
});

export const createPrescriptionSchema = prescriptionBodySchema.extend({
  appointmentId: cuid,
});
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

/** Overwrite a still-draft prescription. */
export const updatePrescriptionSchema = prescriptionBodySchema;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;

/* ---------------------------------------------------- prescription templates */

/** A doctor's reusable prescription skeleton. Every clinical field is optional —
 *  a template can be just a name + a medicine list, or a full draft. */
export const prescriptionTemplateBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  symptoms: z.string().trim().max(2000).optional(),
  diagnosis: z.string().trim().max(2000).optional(),
  advice: z.string().trim().max(4000).optional(),
  followUpDays: z.number().int().min(1).max(365).optional(),
  drugCategoryFlags: z.array(z.nativeEnum(DrugCategoryFlag)).default([]),
  items: z.array(medicineItemSchema).max(30).default([]),
});
export type PrescriptionTemplateInput = z.infer<typeof prescriptionTemplateBodySchema>;

export const prescriptionTemplateSchema = prescriptionTemplateBodySchema.extend({
  id: cuid,
  createdAt: isoDate,
  updatedAt: isoDate,
});
export type PrescriptionTemplate = z.infer<typeof prescriptionTemplateSchema>;

export const prescriptionItemOutSchema = prescriptionItemSchema.extend({ id: cuid });
export type PrescriptionItemOut = z.infer<typeof prescriptionItemOutSchema>;

export const prescriptionStatusSchema = z.enum(['DRAFT', 'FINALIZED']);
export type PrescriptionStatus = z.infer<typeof prescriptionStatusSchema>;

/** Full prescription for the detail view. `notes` is doctor-only — the API
 *  nulls it for the patient. */
export const prescriptionViewSchema = z.object({
  id: cuid,
  appointmentId: cuid,
  doctorId: cuid, // the consulting doctor's user id — lets the patient book a follow-up
  status: prescriptionStatusSchema,
  issuedAt: isoDate,
  finalizedAt: isoDate.nullable(),
  symptoms: z.string().nullable(),
  diagnosis: z.string(),
  advice: z.string().nullable(),
  notes: z.string().nullable(),
  followUpDate: z.string().date().nullable(),
  drugCategoryFlags: z.array(z.nativeEnum(DrugCategoryFlag)),
  items: z.array(prescriptionItemOutSchema),
  pdfReady: z.boolean(),
  doctorName: z.string(),
  doctorQualifications: z.string(),
  medicalCouncil: z.string(),
  registrationNumber: z.string(),
  patientName: z.string(),
  scheduledStart: isoDate,
});
export type PrescriptionView = z.infer<typeof prescriptionViewSchema>;

/* ----------------------------------------------------------- medical history */

/** One past consultation. `prescription` carries the full record (or null) so
 *  the history UI can show the detail without a second request per row. */
export const medicalHistoryEntrySchema = z.object({
  appointmentId: cuid,
  scheduledStart: isoDate,
  status: z.nativeEnum(AppointmentStatus),
  reasonForVisit: z.string(),
  doctorName: z.string(),
  patientName: z.string(),
  prescription: prescriptionViewSchema.nullable(),
});
export type MedicalHistoryEntry = z.infer<typeof medicalHistoryEntrySchema>;

export const medicalHistorySchema = z.object({
  items: z.array(medicalHistoryEntrySchema),
  nextCursor: z.string().nullable(),
});
export type MedicalHistory = z.infer<typeof medicalHistorySchema>;

/* --------------------------------------------------------------- documents */

export const presignUploadSchema = z.object({
  kind: z.nativeEnum(DocumentKind),
  title: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'max 10 MB'),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

/* ------------------------------------------------------------- pagination */

export const cursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

/** Patient history query — cursor paging plus an optional filter to a single
 *  doctor (the patient's "history with Dr X" view). */
export const medicalHistoryQuerySchema = cursorQuerySchema.extend({
  doctorId: cuid.optional(),
});
export type MedicalHistoryQuery = z.infer<typeof medicalHistoryQuerySchema>;

/* -------------------------------------------------------------- me / profiles */

export const patientProfileOutSchema = patientProfileSchema.extend({
  id: cuid,
  userId: cuid,
  updatedAt: isoDate,
});
export type PatientProfileOut = z.infer<typeof patientProfileOutSchema>;

export const doctorProfileOutSchema = doctorProfileSchema.extend({
  id: cuid,
  userId: cuid,
  verifiedAt: isoDate.nullable(),
  updatedAt: isoDate,
});
export type DoctorProfileOut = z.infer<typeof doctorProfileOutSchema>;

/** Result of uploading or clearing the current user's avatar. */
export const avatarResultSchema = z.object({ avatarUrl: z.string().url().nullable() });
export type AvatarResult = z.infer<typeof avatarResultSchema>;

export const meSchema = z.object({
  user: userSchema.extend({
    emailVerified: z.boolean(),
    createdAt: isoDate,
    updatedAt: isoDate,
  }),
  patientProfile: patientProfileOutSchema.nullable(),
  doctorProfile: doctorProfileOutSchema.nullable(),
});
export type Me = z.infer<typeof meSchema>;

/* --------------------------------------------------------- data export (DPDP) */

/** A prescription as it appears in the patient's own data export — flat and
 *  self-contained; doctor-only clinical `notes` are never included. */
export const dataExportPrescriptionSchema = z.object({
  id: cuid,
  appointmentId: cuid,
  issuedAt: isoDate,
  finalizedAt: isoDate.nullable(),
  symptoms: z.string().nullable(),
  diagnosis: z.string(),
  advice: z.string().nullable(),
  followUpDate: z.string().date().nullable(),
  drugCategoryFlags: z.array(z.string()),
  items: z.array(prescriptionItemOutSchema),
});
export type DataExportPrescription = z.infer<typeof dataExportPrescriptionSchema>;

/** Everything CareLink holds about the requesting patient — served by
 *  `GET /me/export` as a downloadable JSON file (DPDP right to access). */
export const patientDataExportSchema = z.object({
  exportedAt: isoDate,
  user: z.object({
    id: cuid,
    email: z.string().email(),
    fullName: z.string(),
    phone: z.string().nullable(),
    role: z.nativeEnum(UserRole),
    emailVerified: z.boolean(),
    avatarUrl: z.string().nullable(),
    createdAt: isoDate,
  }),
  patientProfile: patientProfileOutSchema.nullable(),
  appointments: z.array(appointmentSchema.extend({ doctorName: z.string() })),
  prescriptions: z.array(dataExportPrescriptionSchema),
  messages: z.array(messageSchema),
  documents: z.array(
    z.object({
      id: cuid,
      kind: z.nativeEnum(DocumentKind),
      title: z.string(),
      uploadedAt: isoDate,
    }),
  ),
});
export type PatientDataExport = z.infer<typeof patientDataExportSchema>;
