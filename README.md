# CareLink

Online consultation app for a single practising doctor (India) and their patients.
Text-based consultation for v1; live video in v2. Full design in
[docs/PLAN.md](docs/PLAN.md).

## Stack

| Part | Tech | Hosting (free tier) |
| --- | --- | --- |
| `apps/web` | React 18 + Vite + TS + TanStack Query | Vercel |
| `apps/mobile` | Expo SDK 57 (RN 0.86 / React 19) | EAS |
| `apps/api` | NestJS (serverless) + Drizzle ORM; own email+password auth; Nodemailer | Vercel serverless |
| `packages/shared` | zod schemas + shared enums (the API contract) | — |
| Data / Realtime / Storage | Supabase (Postgres, Singapore) | Supabase |
| Email | Nodemailer over free SMTP (Brevo etc.) | — |
| Scheduled jobs | GitHub Actions cron -> `POST /api/v1/jobs/run` | GitHub |

## Prerequisites

- Node 20 (`nvm use`)
- npm 10+ (repo uses npm workspaces + Turborepo)
- A Supabase project (free) for DB + Auth

## Setup

```bash
npm install
npm run build --workspace @carelink/shared   # shared must build first

cp apps/api/.env.example    apps/api/.env
cp apps/web/.env.example    apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
# fill in Supabase URL / keys / DB connection strings

npm run db:generate --workspace @carelink/api   # create SQL migration from schema
npm run db:migrate  --workspace @carelink/api   # apply to Supabase
```

Seed the single doctor account:

```bash
DOCTOR_EMAIL=doc@example.com DOCTOR_PASSWORD='<strong-pw>' \
  npm run db:seed --workspace @carelink/api
```

Local dev shortcut — pre-verified test patient + doctor (`password123`):

```bash
npm run db:seed:test --workspace @carelink/api
# patient@test.local / doctor@test.local
```

## Auth (M1)

`/api/v1/auth`: `POST register`, `GET verify?token=`, `POST login`, `POST refresh`,
`POST logout`, `POST forgot`, `POST reset`, `POST resend-verification`. Authed
routes: `GET /me`, `PUT /me/patient-profile`, `PUT /me/doctor-profile` (doctor only).

Token transport:

- **Web** — `login`/`refresh` set httpOnly `carelink_access` / `carelink_refresh`
  cookies (+ a readable `carelink_csrf`). The client sends cookies automatically
  and echoes `carelink_csrf` in an `x-csrf-token` header on writes.
- **Mobile** — `login`/`refresh` also return `{ accessToken, refreshToken,
  expiresIn }`; stored in `AsyncStorage`, sent as `Authorization: Bearer …`.

With SMTP unset, verification/reset links print to the API console.

## Booking (M2)

- `GET /doctors`, `GET /doctors/:id`, `GET /doctors/:id/slots?from=YYYY-MM-DD&to=…`
- Doctor: `GET/PUT /me/availability/rules` (weekly template, replace-all),
  `GET/PUT/DELETE /me/availability/exceptions` (date overrides)
- `POST /appointments` `{ doctorId, scheduledStart, reasonForVisit, consentAccepted:true }`,
  `GET /appointments?scope=upcoming|past|all`, `GET /appointments/:id`,
  `POST /appointments/:id/{cancel,reschedule,verify-identity}`
- `POST /me/push-tokens` `{ token, platform }`
- `POST /jobs/run` (header `x-cron-secret: $CRON_SECRET`) — sends due reminders +
  pings the DB. Fired by `.github/workflows/cron.yml` every 5 min.

Slots are computed in IST (`Asia/Kolkata`) with a 60-min booking lead time.

## Develop

```bash
npm run dev                       # everything via turbo
# or individually:
npm run dev --workspace @carelink/api      # http://localhost:3000/api/v1/healthz
npm run dev --workspace @carelink/web      # http://localhost:5173
npm run dev --workspace @carelink/mobile   # Expo
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
```

## Deploy (outline — see docs/PLAN.md §11)

- **Web**: Vercel project, root `apps/web`, framework Vite.
- **API**: separate Vercel project, root `apps/api`; set env from
  `apps/api/.env.example`. `DATABASE_URL` = Supabase **pooled** (6543);
  `DIRECT_URL` = direct (5432) for migrations.
- **Cron**: add repo secret `CRON_SECRET` and variable `API_BASE_URL`.
- **Mobile**: `eas build` / `eas submit`.

## Status

M0 scaffold — auth, booking, chat, and prescriptions land in M1–M4
(see docs/PLAN.md §14).
