# CareLink — Online Consultation Patient App — Implementation Plan

_Living document. M0–M4 + M6 + M7 code-complete, M5 mostly done (see §15). Repo
lives inside the existing `Hari/` folder._

## 1. Goal

A telemedicine app (India) where patients **find a doctor** — by name or
specialization, or from the doctors they've already seen — book an appointment
slot, have a **text-based consultation** at the scheduled time, and receive a
digital prescription. Live video consultation comes in v2.

The doctor side is multi-doctor, but doctors are **provisioned by a seed script
or an operator** with `verifiedAt` set by hand — there is no in-app doctor
self-registration or verify/reject workflow in v1 (that lands with the admin
panel). Practically: a small panel of doctors the operator personally vets.

Three clients, one backend:

- **Web** — React (patients + doctor)
- **Mobile** — React Native / Expo (patients + doctor)
- **API** — NestJS, running as Vercel serverless functions

Hard constraint: **every piece must sit on a free tier.**

## 2. v1 scope (agreed)

1. **Auth + profiles** — patient signup/login, doctor profile, role-aware dashboard
2. **Doctor discovery** — patient searches verified doctors by name / keyword /
   specialization (sortable by name, fee, experience), sees a public profile, and
   can re-book a doctor they've already visited
3. **Appointment booking** — doctor publishes availability, patient picks a doctor
   then a slot, reminders
4. **Chat consultation** — at appointment time a text thread opens between patient
   and doctor; consent + identity verification captured here
5. **Prescriptions** — doctor issues a prescription PDF, patient downloads

Clients: patient and doctor both get web + mobile. **Mobile is paused after M2**
(functional, NativeWind wired); M3+ is web + API only until resumed.

Deferred: **doctor self-registration + verify/reject workflow** (with the admin
panel), symptom→specialization mapping, a curated specialization taxonomy.
Deferred to v2: **live video consultation (Jitsi)**, **payments (Razorpay)**,
phone-OTP login, multi-clinic, lab integrations, insurance, in-app pharmacy,
ABDM/ABHA health-ID linkage.

## 3. India compliance notes (read before launch)

Not legal advice — flag these with the doctor and, ideally, a lawyer before real
patients use it.

- **Telemedicine Practice Guidelines 2020** (Board of Governors / NMC). The app must:
  - Let the doctor **verify patient identity** and record that it happened.
  - Capture **explicit patient consent** for teleconsultation and store it.
  - Produce a **record** per consult: chat transcript + notes + prescription, retained.
  - Put the doctor's **name, qualifications, medical council + registration
    number** on every prescription (typed is acceptable for v1).
  - Make the **drug category** explicit on the prescription form (some categories
    can't be prescribed via teleconsult; the doctor is responsible).
- **DPDP Act 2023**: health data is sensitive. Need a privacy notice, consent
  capture, purpose limitation, a breach process, and a data-deletion routine.
- **Data residency**: keep DB + storage in India/Singapore (Supabase Singapore region).
- **Audit log**: append-only record of who accessed/changed what (in the model below).

No free tier signs a formal data-processing agreement. Acceptable for a pilot
with the doctor's own patients + clear consent; revisit before a public launch.

## 4. Tech stack (final)

| Concern | Choice | Free-tier reality |
|---|---|---|
| Web app | React 18 + Vite + TypeScript, React Router, TanStack Query, Tailwind | — |
| Web hosting | **Vercel** (Hobby) | Free. Hobby licence is technically non-commercial; Cloudflare Pages is the fallback if that matters. |
| Mobile | **Expo SDK 57** (RN 0.86 / React 19), Expo Router, TanStack Query, EAS Build | EAS free tier: limited concurrent builds, fine for one dev. |
| Push | **Expo Push Notifications** | Free. |
| API | **NestJS** as **Vercel serverless functions** (REST only; single handler via `serverless-http` wrapping the Express instance) | Free. Cold start ~1–2s, scales to zero, no forced sleep. No WebSockets, no long-running processes. |
| Database | **Supabase Postgres** + **Drizzle ORM** (drizzle-kit migrations) | Free: 500 MB DB, Singapore region. **Pauses after 7 days inactivity** — the reminder cron doubles as a keep-alive. |
| Auth | **Own email + password** in NestJS — bcrypt hashes, a single `@nestjs/jwt` access token (7 d, no refresh), email-verification + password-reset tokens (SHA-256 hashed in `auth_tokens`). No third-party auth. | Free. Phone OTP + Google sign-in deferred to v2. |
| Realtime chat | **v1: short polling** (web re-fetches the thread every 4 s while open). **Supabase Realtime deferred** — `postgres_changes` + a short-lived channel JWT the API mints with `SUPABASE_JWT_SECRET`; wire it once a real Supabase project exists. No Socket.IO. | Polling is free and fine for one doctor. Realtime free tier: 200 concurrent, 2M msgs/mo. |
| File storage | **Cloudinary** — prescription PDFs (M4); chat attachments + medical documents later. Uploads are `type: authenticated` / `resource_type: raw`; the browser never hits Cloudinary — the API fetches bytes back with a short-lived signed URL and streams them. If `CLOUDINARY_URL` is unset the PDF is rendered on demand instead (nothing stored). | Free: 25 monthly credits (~25 GB storage or bandwidth). Cloudflare R2 (10 GB) is the fallback. |
| Scheduled jobs | **GitHub Actions cron** → calls a secret-protected `POST /api/v1/jobs/run` route every 5 min (reminders + Supabase keep-alive) | Free for this size. Vercel Hobby cron is too limited for 5-min cadence. |
| PDF generation | `pdfkit` server-side inside the API — built-in Helvetica, no font files on the serverless bundle | Free. |
| Transactional email | **Nodemailer over SMTP** — verification, password reset, booking + prescription notices. Free SMTP: Brevo (300/day), Gmail app password, MailerSend. | Free. |
| Monorepo | **Turborepo** + npm workspaces | Free. |
| CI | **GitHub Actions** | Free. |
| Error tracking | **Sentry** free tier | 5k errors/mo. |
| Video (M6) | **Jitsi** — web embed via `@jitsi/react-sdk` (`meet.jit.si`, `JITSI_DOMAIN` env); `VideoSession` row per appointment with an unguessable room name, API-issued join URL. Mobile (`@jitsi/react-native-sdk`) deferred with the rest of mobile. Self-host on an Oracle Always Free VM later. | Free. |

## 5. Monorepo layout

```
Hari/
├─ apps/
│  ├─ web/            # React + Vite  → Vercel
│  ├─ mobile/         # Expo
│  └─ api/            # NestJS + Drizzle (serverless) → Vercel
│     ├─ api/index.ts # Vercel function entry (serverless-http)
│     ├─ src/db/      # schema.ts, migrate.ts, seed.ts, db.module.ts
│     └─ drizzle/     # generated SQL migrations
├─ packages/
│  └─ shared/         # zod schemas, shared enums (the API contract)
├─ docs/PLAN.md
├─ .github/workflows/ # ci.yml, cron.yml
├─ eslint.config.mjs
├─ turbo.json
└─ package.json       # npm workspaces: packages/*, apps/*
```

`packages/shared` is the contract: zod schemas for every request/response, shared
enums (`AppointmentStatus`, `UserRole`, …), inferred types used by all three apps.

## 6. Data model (Drizzle, abbreviated)

```
User            id, role(PATIENT|DOCTOR|ADMIN), email, passwordHash,
                emailVerifiedAt?, phone, fullName, avatarUrl, createdAt, disabledAt

AuthToken       userId→User, kind(EMAIL_VERIFY|PASSWORD_RESET),
                tokenHash, expiresAt, consumedAt?, createdAt

PatientProfile  userId→User, dob, gender, bloodGroup, heightCm, weightKg,
                address, emergencyContactName, emergencyContactPhone,
                allergies[], chronicConditions[]

DoctorProfile   userId→User, medicalCouncil, registrationNumber, verifiedAt,
                specializations[], qualifications, yearsExperience, bio,
                consultationFeeInr, clinicName

AvailabilityRule       doctorId→DoctorProfile, weekday(0-6), startTime, endTime,
                       slotMinutes, effectiveFrom, effectiveTo   # weekly template
AvailabilityException  doctorId, date, isClosed, startTime?, endTime?  # overrides

Appointment     id, patientId, doctorId, scheduledStart, scheduledEnd,
                status(REQUESTED|CONFIRMED|CANCELLED|COMPLETED|NO_SHOW),
                reasonForVisit, consentAcceptedAt, identityVerifiedAt,
                cancelledBy?, cancelReason?, createdAt

ChatThread      appointmentId→Appointment (1:1), opensAt, closesAt
Message         threadId→ChatThread, senderId→User, body, attachmentKey?,
                sentAt, readAt          # INSERT here → Supabase Realtime pushes it

Prescription     id, appointmentId, doctorId, patientId, issuedAt,
                 finalizedAt?, symptoms?, diagnosis, advice?, notes?,
                 followUpDate?, pdfKey?, drugCategoryFlags[]
                 # finalizedAt null → draft (patient can't see it). Set on issue:
                 # PDF rendered, appointment → COMPLETED, patient notified.
                 # notes = doctor-only clinical notes, never returned to the patient.
                 # pdfKey = Cloudinary public_id once uploaded.
PrescriptionItem prescriptionId→Prescription, position, drugName, strength, form,
                 frequency, durationDays, instructions

VideoSession    id, appointmentId→Appointment (1:1), roomName (unique,
                unguessable), startedAt?, endedAt?, createdAt
                # created lazily on first open of the video page; joinable
                # scheduledStart−5min … scheduledEnd+30min

MedicalDocument patientId→User, uploadedById→User, kind(LAB_REPORT|SCAN|OTHER),
                title, fileKey, uploadedAt

Notification    userId→User, kind, payloadJson, channel(PUSH|EMAIL), sentAt, readAt

AuditLog        actorUserId?, action, entityType, entityId, ip, userAgent, createdAt
```

`*Key` fields hold Cloudinary public_ids; the API fetches bytes back with a
short-lived signed URL and streams them (the browser never hits Cloudinary).

## 7. Auth flow (own email + password)

- `POST /auth/register` — patient submits email + password + name. API stores a
  bcrypt hash, creates the `User` (role `PATIENT`, `emailVerifiedAt` null), issues
  an `EMAIL_VERIFY` token (random, stored as SHA-256 hash, 24 h TTL) and emails a
  verification link via Nodemailer.
- `GET /auth/verify?token=…` — marks `emailVerifiedAt`, consumes the token.
- `POST /auth/login` — checks the hash; unverified emails are rejected. Returns a
  **access JWT** (7 d, `@nestjs/jwt`, `JWT_ACCESS_SECRET`). No refresh token —
  `POST /auth/logout` just clears the cookie.
- `POST /auth/forgot` / `POST /auth/reset` — `PASSWORD_RESET` token by email, 1 h TTL.
- **Token transport differs by client:**
  - **Web** — the API sets `carelink_access` + `carelink_refresh` as **httpOnly,
    Secure, SameSite** cookies (no token in JS), plus a readable `carelink_csrf`
    cookie. The browser sends the cookies automatically (`credentials: 'include'`);
    a global `CsrfGuard` requires the `carelink_csrf` value echoed in an
    `x-csrf-token` header on cookie-authenticated mutating requests (double-submit).
  - **Mobile** — response JSON carries the token pair; stored in `AsyncStorage`,
    sent as `Authorization: Bearer <access_jwt>`. Bearer requests skip CSRF.
- `JwtAuthGuard` accepts the access token from the Bearer header **or** the
  `carelink_access` cookie. `RolesGuard` enforces `PATIENT` / `DOCTOR` / `ADMIN`.
- Cookie flags via env: `COOKIE_SECURE` (default = prod), `COOKIE_SAMESITE`
  (`lax`; use `none` only for split web/API sites), `COOKIE_DOMAIN`.
- **Doctor account**: `role = DOCTOR` with `emailVerifiedAt` + `DoctorProfile.verifiedAt`
  set. In dev, `npm run seed:run` creates demo doctors; in prod, insert directly or
  promote a registered account (no prod seed script). Patients self-register.
- Rate-limit `login` / `register` / `forgot` (`@nestjs/throttler`).

## 8. Core flows

**Discovery → booking**
1. Patient opens **Find a doctor** → `GET /doctors?q=&specialization=&sort=`
   (verified doctors only; in-memory filter/sort). `GET /doctors/specializations`
   fills the filter; `GET /me/doctors` shows doctors they've already consulted
   for one-tap re-booking. Each result links to `GET /doctors/:id` (public
   profile) then `/book?doctorId=…`.
2. Patient opens the chosen doctor's calendar → API expands `AvailabilityRule` +
   `AvailabilityException` minus booked `Appointment`s into free slots.
3. Patient picks a slot, enters reason for visit, ticks the **teleconsultation
   consent** box → `POST /appointments` creates it `CONFIRMED` (auto-confirm),
   records `consentAcceptedAt`, and creates the `ChatThread` with
   `opensAt = scheduledStart` / `closesAt = scheduledEnd + 7 days`.
4. API writes reminder `Notification` rows; the cron worker sends them (24 h and
   15 min before). Reschedule reuses the flow with `?reschedule=<id>`, keeping the
   original doctor.

**Chat consultation**
- From `opensAt` the thread accepts messages. Client subscribes to Supabase
  Realtime on `messages` filtered by `threadId`.
- Send = `POST /messages` (API validates, checks the thread window, writes the
  row, runs audit) → Realtime pushes the insert to both participants.
- Attachments: signed PUT to Supabase Storage, key stored on the message.
- Doctor ticks **identity verified** on the appointment → stamps
  `Appointment.identityVerifiedAt`.

**Prescription** (draft → finalised lifecycle)
1. Doctor fills a form: symptoms, diagnosis, drug rows, advice, doctor-only
   clinical notes, follow-up date, drug-category flags. `POST /prescriptions`
   saves it as a **draft** (patient can't see it); `PATCH /prescriptions/:id`
   overwrites the draft.
2. `POST /prescriptions/:id/finalize` → API renders the PDF with `pdfkit`
   (doctor name, qualifications, council + registration number, timestamp),
   uploads it to Cloudinary if configured (else renders on demand later), sets
   `Prescription.finalizedAt`, and flips `Appointment.status = COMPLETED`.
3. Patient gets a push + email (no PHI) and can view/download the PDF via
   `GET /prescriptions/:id/pdf` (served through the API — fetched back from
   Cloudinary with a short-lived signed URL, or re-rendered if not stored).

## 9. API surface (NestJS modules)

- `AuthModule` — register / verify / login / refresh / forgot / reset, `GET /me`, `JwtAuthGuard`, `RolesGuard`
- `MailModule` — Nodemailer transport + templated senders
- `UsersModule` — `GET /me`, `PatientProfile` / `DoctorProfile` upsert, `DELETE /me` (DPDP hard delete; PATIENT only — password + typed `DELETE` confirmation; removes the user and every referencing row in a transaction)
- `AvailabilityModule` — doctor discovery (`GET /doctors` with `q` / `specialization` / `sort`, `GET /doctors/specializations`, `GET /doctors/:id`, `GET /me/doctors`), doctor rules/exceptions, `GET /doctors/:id/slots?from&to`. Literal routes are declared before `:id` so `/doctors/specializations` and `/me/doctors` win.
- `AppointmentsModule` — book, list, cancel, reschedule, identity-verified stamp
- `ChatModule` — `GET /appointments/:id/thread`, `GET /threads/:id/messages`, `POST /messages`; identity-verified stamp lives on `AppointmentsModule`. v1 delivery is client polling.
- `VideoModule` — `GET /appointments/:id/video` (creates the `VideoSession` lazily, returns domain + room + `canJoin` for the window), `POST …/video/start` (stamps `startedAt`, notifies the patient when the doctor starts), `POST …/video/end`. Media is peer-to-peer via Jitsi — never through the API.
- `StorageModule` — Cloudinary wrapper (`@Global`): upload + signed-URL fetch of private files. No-op when `CLOUDINARY_URL` is unset.
- `PrescriptionsModule` — `POST /prescriptions` (draft), `PATCH /prescriptions/:id`, `POST /prescriptions/:id/finalize`, `GET /prescriptions/:id`, `GET /prescriptions/:id/pdf` (StreamableFile), `GET /appointments/:id/prescription`, `GET /medical-history` (patient), `GET /patients/:id/history` (doctor, own appointments only)
- `DocumentsModule` — signed upload/download, list by patient (Tier 2; reuses `StorageModule`)
- `NotificationsModule` — Expo push, email senders
- `JobsModule` — `POST /jobs/run` (cron-key-protected): due reminders + keep-alive
- `AuditModule` — global `AuditInterceptor` (`@Global`): one `audit_logs` row per **successful** mutating request (method + mounted route + entity type/id from params, actor, first-hop IP, user-agent). No request bodies, no PHI. Writes are best-effort — a failed audit never fails the request.
- `HealthModule` — `GET /healthz`

Style: `/api/v1/...`, zod-validated DTOs from `packages/shared`, cursor pagination.
Per-route rate limits (`@Throttle`, on top of the global 120/min/IP): auth
register/login/forgot/reset/resend (3–10/min), `POST /appointments` (15/min),
`POST /messages` (60/min), `POST /prescriptions` + `/finalize` (20/min).

## 10. Notifications

- **Push** (Expo): booking confirmed, reminder 24 h / 15 min, consultation window
  open, new chat message, prescription ready.
- **Email** (Nodemailer/SMTP): email verification, password reset, booking
  confirmation with an `.ics` attachment, "prescription ready — log in to view"
  (no PHI in the body).
- **Cron** (GitHub Actions, every 5 min) → `POST /api/v1/jobs/run` with a shared
  secret: find due reminders, send, stamp `Notification.sentAt`; also a trivial DB
  read to keep Supabase from pausing.

## 11. Environments & deployment

| | Pilot | Production (still free) |
|---|---|---|
| Web | Vercel (Hobby) | same |
| Mobile | Expo EAS + internal distribution / TestFlight | EAS + store submission |
| API | Vercel serverless | same |
| DB / Realtime / Storage | Supabase free (Singapore) | same; watch the 500 MB / 1 GB ceilings |
| Auth | In the API (email + password) | same |
| Email | Nodemailer → free SMTP (Brevo etc.) | same |
| Cron | GitHub Actions schedule | same |

Secrets: `.env` per app; real values in Vercel project env + GitHub Actions
secrets. Never committed.

## 12. Free-tier ceilings — when you outgrow them

- **Supabase 500 MB DB**: `Message` and `AuditLog` are the only unbounded tables
  — full plan in §12.1. **Tier 3 / do-it-last**, except the size alert (ship early).
- **Supabase 7-day pause**: neutralised by the 5-min cron keep-alive.
- **Cloudinary free tier**: 25 monthly credits (~25 GB storage or bandwidth).
  Prescription PDFs are a few KB each — years of headroom. Lab-report scans (Tier
  2) are the real consumer; cap size + count, or move that bucket to Cloudflare
  R2 (10 GB, zero egress).
- **Vercel serverless**: cold start ~1–2s; execution-time limits mean PDF
  generation must stay quick (`pdfkit` with built-in fonts is fast).
- **Supabase Realtime**: not used in v1 (chat polls). 200 concurrent / 2M msgs a
  month if/when it's wired — well above a single-doctor practice.

### 12.1 Messages & audit logs — keeping the 500 MB DB

Only ~350 MB is really usable (relational core, indexes, WAL, bloat take the
rest). Messages and audit logs are very different risks:

| Data | Row size (with indexes) | Single-doctor volume | Verdict |
|---|---|---|---|
| Chat messages | ~250–400 B | ~600/day → ~1 M rows in ~4 yrs ≈ 300–400 MB | Grows forever, not a near-term problem |
| Audit logs | ~400–700 B (IP + user-agent strings) | 5–20× message volume if every mutation **and** every PHI read is logged | What actually eats the 500 MB, and almost never queried |

**Recommended split:**

| Data | Where | Why |
|---|---|---|
| Audit log | **Off Postgres** — Axiom free tier (~500 GB/mo ingest, 30-day retention) or Grafana Cloud Loki (50 GB free); or, no new vendor, daily gzipped NDJSON to R2 (`audit/YYYY/MM/DD.ndjson.gz`) | Write-once, huge, rarely read |
| Messages — open / recent threads | Postgres, as planned | Supabase Realtime `postgres_changes` needs them there |
| Messages — threads closed > 90 days | **Archived**: gzip JSON to R2, rows deleted, keep `ChatThread.archiveKey`; history endpoint falls back to the archive | Keeps the hot table small |
| Attachments + archives | **Cloudflare R2** (10 GB, zero egress) instead of Supabase Storage's 1 GB | |

**Schema trims for `Message`:**

- Per-thread read cursor (`MessageRead(threadId, userId, lastReadAt)`) instead of `readAt` on every row.
- `timestamptz`, not text timestamps; move `attachmentKey` to a sparse side table.

**Optional:** keep only the last 30 days of security-relevant audit events in a
thin `audit_log` table for in-DB querying, purged nightly.

**Compliance:** Telemedicine Guidelines + DPDP require *retention* of the consult
record — this is **archive, not delete**. Same controls on the R2 bucket:
private, signed URLs ≤ 5 min, UUID keys.

**Size alert (do this early):** the 5-min keep-alive cron also runs
`pg_database_size()` weekly and emails / Sentry-alerts at 70 % and 85 %.

## 13. Security checklist

- HTTPS everywhere (Vercel + Supabase manage TLS).
- Supabase JWT verified on every request; short access-token TTL + refresh.
- Row-level authorization in every service method (patient sees only own data;
  doctor sees only own patients' appointment-scoped data). Supabase RLS on
  `messages` becomes relevant only if/when Realtime reads the table directly;
  until then every read goes through an authz'd API method.
- Signed URLs (Cloudinary `private_download_url`) expire in ≤ 5 min; the browser
  never gets them — the API fetches and streams. Object keys are opaque ids.
- `Prescription.notes` (doctor-only clinical notes) is nulled for the patient in
  every response and omitted from their history.
- Rate limits: global 120/min/IP `ThrottlerGuard` + tighter `@Throttle` on auth,
  booking, chat-send and prescription writes. ✅
- `/jobs/run` gated by a long random `CRON_SECRET` header.
- Audit log on every successful mutation via a global `AuditInterceptor`
  (`AuditModule`); no bodies, no PHI. ✅ Failed
  requests are not audited (add error-path auditing if an incident review needs it).
- zod validation on every boundary.
- Dependabot; **Sentry** for runtime errors — env-gated (`SENTRY_DSN` / `VITE_SENTRY_DSN`), a global `SentryExceptionFilter` reports 5xx then re-delegates. ✅
- Backups: nightly `pg_dump --format=custom` → gzip → Cloudflare R2 via `.github/workflows/backup.yml` (00:47 IST), 30-day prune; test-restore monthly (manual). ✅ (needs `DIRECT_URL` + R2 secrets)
- DPDP data-deletion: `DELETE /me` — **hard delete**, PATIENT only, password + typed `DELETE` confirmation; transaction removes messages / prescriptions / appointments / documents then the user (rest cascade). Drops the shared consult record for the counterparty too. Doctor removal stays an ops task. ✅

## 14. Module priority roadmap

_Folds the broader module wishlist (the `plan.md` draft) into build-order tiers.
Tiers are sequence, not calendar time. Every module here is mapped onto the
already-resolved free-tier stack in §4 — the wishlist's alternative choices
(Clerk, Socket.IO + Redis, S3, Docker/Nginx) are **not** adopted._

### Tier 1 — Important (build first)

The discover → book → consult → prescription loop. This **is** v1; most of it is
already built or scheduled in the milestones below.

| Module | Scope for v1 | Milestone |
|---|---|---|
| Authentication & authorization | Patient email+password (verify / refresh / reset), doctor via seed script, `RolesGuard` (PATIENT / DOCTOR / ADMIN) | M1 ✅ |
| User + patient + doctor profiles | Common profile, patient medical basics + emergency contact, doctor qualifications / council / reg. number / fee | M1 ✅ |
| Doctor discovery | `GET /doctors` search (name / keyword / specialization; sort by name / fee / experience, verified only), `GET /doctors/specializations`, public profile, `GET /me/doctors` (re-book a doctor already seen). Web: `/doctors`, `/doctors/:id`; booking is doctor-scoped via `?doctorId=`. | M7 ✅ |
| Specialization | Free-text array on `DoctorProfile`, surfaced as the discovery filter. No taxonomy table / symptom mapping yet (Tier 2). | M7 ✅ |
| Doctor availability | Weekly `AvailabilityRule` + date `AvailabilityException`, IST slot expansion | M2 ✅ |
| Appointment management | Book (consent + slot re-validation), list, cancel, reschedule, statuses, 24 h / 15 min reminders, list + calendar views | M2 ✅ |
| Chat consultation | Thread window, `POST /messages`, history + read receipts, identity-verified stamp, message notifications. **v1 delivery = polling; Supabase Realtime + `messages` RLS + attachments deferred.** | M3 ✅ (polling) |
| Video consultation | Jitsi web embed, one room per appointment, join window, start/end tracking, `video_started` push. Mobile deferred. | M6 ✅ (web) |
| Consultation notes | Symptoms, clinical notes (doctor-only), diagnosis, advice, follow-up — fields on the prescription | M4 ✅ |
| Prescription | Doctor form, draft → finalize lifecycle, `pdfkit` PDF (name + council + reg. number), Cloudinary storage (optional; renders on demand otherwise), patient view + download, appointment → COMPLETED, prescription-ready notification | M4 ✅ |
| Medical history | `GET /medical-history` (patient) + `GET /patients/:id/history` (doctor, own appointments only); web history screen. Uploaded-report links come with `DocumentsModule` (Tier 2). | M4 ✅ |
| Notifications (core) | Push + email for: booking confirmed, reminders, consult window open, new message, prescription ready | M2 ✅ / M4 ✅ |
| Audit & security | Audit-log interceptor ✅ · tighter rate limits ✅ · env-gated Sentry ✅ · nightly `pg_dump` → R2 ✅ · DPDP `DELETE /me` hard delete ✅ · _pending: privacy + consent copy (legal text), production deploy_ | M5 |

### Tier 2 — Medium (build in the middle)

Valuable, but not required for the first working loop. Roughly "v1.1" — after the
pilot, before scale.

| Module | Why it's middle | Notes |
|---|---|---|
| Medical documents upload | Patients want to share lab reports during a consult; doesn't block the core loop | `DocumentsModule` (already in the §9 API surface): signed PUT / GET to Cloudinary, file-type + size caps, attach to an appointment |
| Symptom → specialization mapping | Discovery ships with name + specialization search; complaint-based search is the upgrade | Curated lookup table ("chest pain" → Cardiology) + a canonical specialization taxonomy to replace the free-text array |
| Doctor rating filter on discovery | Needs the reviews module first | Add `sort=rating` / min-rating once `reviews` exists |
| Payments | A paid pilot may want the consult fee up front | Razorpay (India); `payments` + `refunds` tables, statuses PENDING / PAID / FAILED / REFUNDED / CANCELLED. Deferred from v1 in §16. |
| Reviews & ratings | Trust signal; gate on a COMPLETED consultation, one review per appointment | `reviews` table, average + count on the doctor profile, admin moderation |
| In-app notification centre | Push + email already cover the essentials | `Notification` rows already exist — add a list + read/unread UI |
| Consultation-room polish | Basic chat works without it | Timer, presence, typing indicator, online/offline status |
| Account-settings polish | The minimal profile is enough for the pilot | Avatar upload, contact fields, account-status self-service |

### Tier 3 — Low (build last)

Scale, multi-tenant, ops, or explicitly deferred. Only worth it once the practice
outgrows "one doctor, own patients".

- **Video consultation on mobile** — `@jitsi/react-native-sdk`; web is done (M6). Also: self-hosted Jitsi + room passwords.
- **Admin panel** — dashboard, doctor verification / suspension, patient management, appointment + payment management, support tickets. Needs a staffed operator; a single doctor has no admin.
- **Doctor earnings** — revenue, platform commission, payout history. Only with payments **and** multiple doctors.
- **In-app doctor verification & onboarding** — replaces the seed script when doctors self-register.
- **SMS / WhatsApp notifications** — cost + DLT / compliance overhead; push + email suffice for a pilot.
- **Multi-doctor marketplace / multi-clinic**, **family / dependent accounts**, **referrals / coupons / subscriptions**, **pharmacy & lab integrations**, **ABDM / ABHA health-ID linkage**.
- **AI-assisted features**, **advanced analytics & reporting**.
- **Phone-OTP / Google sign-in** (deferred in §16).
- **DB space management** — move `AuditLog` off Postgres (log sink, or gzipped
  NDJSON to R2) and archive closed chat threads to R2 via a nightly retention
  job, plus schema trims for `Message`. Important, but only bites near the 500 MB
  ceiling — full plan in §12.1. Exception: ship the weekly `pg_database_size()`
  alert early; do the rest when the DB crosses ~70 %.

## 15. Milestones

| # | Deliverable | Size | Status |
|---|---|---|---|
| M0 | Monorepo scaffold: Turborepo + npm, `shared` package, web + mobile + api hello-world, Drizzle schema + generated migration, CI. | 1 | ✅ code done |
| M1 | Auth end-to-end: NestJS email+password (register/verify/login/refresh/logout/forgot/reset), Nodemailer (console fallback), throttling, httpOnly-cookie transport for web + Bearer for mobile + `CsrfGuard`, `JwtAuthGuard` + `RolesGuard`, `GET /me`, `PUT /me/(patient|doctor)-profile`; web: full auth flow + profile screens; mobile: login/register/home; seed + test-seed scripts. _Remaining: run against a real DB._ | 1.5 | ✅ code done |
| M2 | Availability + booking: `availability` module (public `GET /doctors[/:id][/slots]` + doctor `me/availability` CRUD, IST slot-expansion in `slots.ts`, 7 unit tests), `appointments` module (book with consent + slot re-validation, list with keyset cursor, cancel, reschedule, verify-identity), `notifications` module (Expo push + Nodemailer, confirm + 24h/1h reminders, push-token endpoint), `jobs` module (`POST /jobs/run` behind `x-cron-secret` → dispatch due + Supabase keep-alive). Web: `/book`, `/appointments`, doctor `/availability`, `AppShell` nav — all on `@carelink/theme` tokens + the shadcn `ui/` kit. Mobile: bottom-tab Home/Appointments/Book. _Remaining: real-DB run; mobile push-token wiring (`expo-notifications`)._ | 2 | ✅ code done |
| M3 | Chat consultation: `ChatThread` window logic (PENDING/OPEN/CLOSED), `GET /appointments/:id/thread`, `POST /messages`, history endpoint with keyset cursor + read receipts, identity-verified stamp, per-message notifications; web `/consult/:id` with 4 s polling. _Deferred: Supabase Realtime subscription, `messages` RLS, chat attachments (all need a live Supabase project + `StorageModule` reuse)._ | 2 | ✅ code done (polling) |
| M4 | Consultation record + prescriptions: `StorageModule` (Cloudinary wrapper), `pdfkit` renderer, `PrescriptionsModule` (draft → `PATCH` → `finalize` → PDF + Cloudinary + appointment COMPLETED + prescription-ready push/email), `GET /prescriptions/:id[/pdf]`, `GET /appointments/:id/prescription`, medical history (`/medical-history`, `/patients/:id/history`); `prescriptions` gains `symptoms` / `notes` / `finalizedAt`, `prescription_items` gains `position` (migration `0001`). Web: doctor prescription form + patient view + PDF download, `/history` screen + nav. 21 API unit tests. _Remaining: real-DB run; set `CLOUDINARY_URL` to persist PDFs._ | 1.5 | ✅ code done |
| M5 | Hardening. **Done:** global `AuditInterceptor` (`audit_logs` row per successful mutation, no PHI, 7 tests); per-route `@Throttle` on auth / booking / chat-send / prescription writes; env-gated **Sentry** (API `SentryExceptionFilter` + web `Sentry.init`); nightly `pg_dump` → R2 GitHub Action; **DPDP `DELETE /me`** hard delete (PATIENT-only, password + typed confirm, 3 tests). **Pending:** privacy notice + consent copy (needs legal text), production deploy. | 1.5 | ◐ mostly done |
| M6 | Video consultation (web): `VideoModule` — `video_sessions` table (migration `0002`), lazy room creation, join window (`scheduledStart−5min … scheduledEnd+30min`), `GET/POST(start|end) /appointments/:id/video`, `video_started` push when the doctor starts, `JITSI_DOMAIN` config, 8 tests. Web: `@jitsi/react-sdk` embed at `/consult/:id/video`, "Video call" link on the consult page. **Live only — recording / live-streaming / transcription are disabled in the embed config and their toolbar buttons removed;** the consultation record stays transcript + notes + prescription. _Deferred: mobile (`@jitsi/react-native-sdk`), self-hosted Jitsi + JWT auth, room passwords._ | 1.5 | ✅ code done |
| M7 | Multi-doctor discovery (folded into v1): `GET /doctors` gains `q` / `specialization` / `sort`, plus `GET /doctors/specializations` and `GET /me/doctors`; in-memory filter/sort over verified doctors, 7 new `availability.service` tests. Web: `/doctors` (search + "doctors you've seen"), `/doctors/:id` profile; `Book` is now doctor-scoped via `?doctorId=` and reads the doctor from the appointment when rescheduling; nav + dashboard point to `/doctors`. Doctors still seed/admin-provisioned — no self-onboarding. | 1 | ✅ code done |

("Size" = relative effort units, not calendar time.) M6 and M7 were both pulled
forward into v1 mid-build.

## 16. Decisions — resolved

| # | Decision | Choice |
|---|---|---|
| 1 | App name | **CareLink** (repo inside `Hari/`) |
| 2 | Web host | **Vercel** |
| 3 | API host | **Vercel serverless** + GitHub Actions cron |
| 4 | Clients | Patient **and** doctor both get web + mobile |
| 5 | Prescription signature | **Typed** name + qualifications + council + registration number |
| 6 | DB | **Supabase** Postgres |
| 6a | File storage | **Cloudinary** (`type: authenticated` raw uploads, API-proxied). Not Supabase Storage. Optional in v1 — PDFs render on demand if `CLOUDINARY_URL` is unset. |
| 6b | PDF generation | **`pdfkit`** (built-in fonts, serverless-friendly). Not `pdfmake`. |
| 6c | Chat delivery | **Short polling (4 s)** for v1. Supabase Realtime deferred until a live Supabase project exists. |
| 7 | Auth | **Own email + password** in the API; **Nodemailer** for email. No Supabase Auth / no third-party auth in v1. |
| 7a | Token transport | **Web = httpOnly cookies + double-submit CSRF**; **mobile = Bearer token in AsyncStorage**. API accepts either. |
| 8 | Mobile | **Expo SDK 57** (RN 0.86 / React 19) |
| 9 | ORM | **Drizzle** (chosen over Prisma for serverless cold starts) |
| 10 | Package manager | **npm** workspaces |
| 11 | Live video consultation | **M6 — web done** (`@jitsi/react-sdk` embed on `meet.jit.si`, API-issued room per appointment). Mobile + self-hosting later. |
| 12 | Payments | **v2** — Razorpay |
| 13 | Phone OTP / Google sign-in | **v2** |
| 14 | DPDP account deletion | **Hard delete** — `DELETE /me` (PATIENT only) removes the user and every referencing row in a transaction; not anonymise. Built (M5). Doctor removal is a manual ops task. |
| 15 | Multi-doctor | **In v1** — patients discover + choose a doctor (search by name / keyword / specialization). Doctors are **seed/admin-provisioned with `verifiedAt` set by hand**; self-registration + verify/reject workflow is deferred to the admin panel. Symptom→specialization mapping and a specialization taxonomy are Tier 2. |

## 17. Still open

- Anything from the earlier Claude chat to fold in (the share link only returned
  the app shell).

Resolved: doctor account is created by a seed script (name, medical council,
registration number by hand, marked verified) — no in-app doctor onboarding in v1.
