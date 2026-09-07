# CareLink — Release checklist (env + third‑party setup)

Everything below sits on a free tier. Do the accounts first, then fill the env
vars, then the one‑time steps.

---

## 1. Third‑party accounts

| Service | Why | Free tier | What you copy out |
|---|---|---|---|
| **Supabase** | Postgres database | 500 MB, pauses after 7 days idle (the cron keep‑alive prevents that) | `DATABASE_URL` (pooled, :6543), `DIRECT_URL` (direct, :5432) — Project Settings → Database. Pick the **Mumbai** or **Singapore** region. |
| **Vercel** | Hosts web + API (two projects) | Hobby | — |
| **SMTP provider** | verification / reset / notification email | Brevo 300/day, or a Gmail app password, or MailerSend | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| **Cloudinary** | stores prescription PDFs | 25 credits/mo (~25 GB) | `CLOUDINARY_URL` — Dashboard → “API environment variable” (`cloudinary://key:secret@cloud`) |
| **GitHub** | CI + cron (reminders + DB keep‑alive) + nightly backup | Actions free for this size | set repo **Secrets** and **Variables** (below) |
| **Cloudflare R2** | nightly `pg_dump` target | 10 GB, no egress fees | bucket name, S3 API token → `R2_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| **Sentry** *(optional)* | error tracking | 5k errors/mo | two projects → `SENTRY_DSN` (Node) + `VITE_SENTRY_DSN` (React) |
| **Jitsi** | video calls | `meet.jit.si` — **no account, nothing to set up** | `JITSI_DOMAIN=meet.jit.si` (default) |
| **Domain + DNS** *(strongly recommended)* | see the cookie gotcha below | any registrar / Cloudflare DNS | e.g. `app.carelink.in` (web) + `api.carelink.in` (API) |
| **Expo / EAS** | push + mobile builds | free | **deferred — mobile is paused** |

Secrets to generate yourself:

```
openssl rand -base64 48    # JWT_ACCESS_SECRET
openssl rand -base64 48    # JWT_REFRESH_SECRET   (different value)
openssl rand -hex 32       # CRON_SECRET
```

---

## 2. API — Vercel project `carelink-api`

Root directory `apps/api`. `vercel.json` is already committed.

### Required

| Var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase **pooled** string (`...pooler...:6543/postgres?pgbouncer=true`) |
| `DB_POOL_MAX` | `1` |
| `JWT_ACCESS_SECRET` | 48‑char random |
| `JWT_REFRESH_SECRET` | 48‑char random (different) |
| `APP_WEB_URL` | `https://app.carelink.in` — used in email links |
| `CORS_ORIGINS` | `https://app.carelink.in` (comma‑separate if more) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `lax` if web+API share a registrable domain (`*.carelink.in`); `none` if they don’t |
| `CRON_SECRET` | 32‑hex random (same value goes in GitHub secrets) |

### Email (leave blank → links print to the function log instead of sending)

`SMTP_HOST`, `SMTP_PORT` (`587`), `SMTP_SECURE` (`false`), `SMTP_USER`, `SMTP_PASS`,
`MAIL_FROM` (`CareLink <no-reply@carelink.in>`)

### Files (leave blank → PDF rendered on demand, not stored)

`CLOUDINARY_URL`, `CLOUDINARY_FOLDER` (`carelink`), `FILE_URL_TTL_SECONDS` (`300`)

### Video / errors / defaults

`JITSI_DOMAIN` (`meet.jit.si`), `SENTRY_DSN` *(optional)*, `SENTRY_TRACES_SAMPLE_RATE` (`0`),
`JWT_ACCESS_TTL` (`15m`), `JWT_REFRESH_TTL` (`30d`)

### `DIRECT_URL`

Not needed at runtime — only for running migrations (locally or in the backup job).

---

## 3. Web — Vercel project `carelink-web`

Root directory `apps/web`, framework **Vite**, build `npm run build`, output `dist`.

| Var | Value |
|---|---|
| `VITE_API_URL` | `https://api.carelink.in` (no trailing slash) |
| `VITE_SENTRY_DSN` | *(optional)* React DSN |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | `0` |

---

## 4. GitHub → Settings → Secrets and variables → Actions

**Variables**

| Name | Value |
|---|---|
| `API_BASE_URL` | `https://api.carelink.in` |

**Secrets**

| Name | Value |
|---|---|
| `CRON_SECRET` | same 32‑hex value as the API |
| `DIRECT_URL` | Supabase **direct** string (`...:5432/postgres`) — for the backup dump |
| `R2_ENDPOINT` | `https://<accountid>.r2.cloudflarestorage.com` |
| `R2_BUCKET` | e.g. `carelink-backups` |
| `AWS_ACCESS_KEY_ID` | R2 S3 token id |
| `AWS_SECRET_ACCESS_KEY` | R2 S3 token secret |

Workflows already in the repo: `ci.yml` (build/lint/test), `cron.yml` (every 5 min →
`POST /api/v1/jobs/run`, reminders + keep‑alive), `backup.yml` (nightly `pg_dump` → R2).

---

## 5. One‑time setup order

1. **Supabase**: create project (Mumbai/Singapore). Copy `DATABASE_URL` + `DIRECT_URL`.
2. **Run migrations** against the new DB:
   `DATABASE_URL=<direct-url> npm run db:migrate --workspace @carelink/api`
   (use the *direct* URL for migrations; applies `0000`–`0002`).
3. **Seed the first doctor** — set `DOCTOR_EMAIL`, `DOCTOR_PASSWORD`, `DOCTOR_NAME`,
   `DOCTOR_COUNCIL`, `DOCTOR_REG_NO`, `DOCTOR_QUALIFICATIONS`,
   `DOCTOR_SPECIALIZATIONS` (comma list), `DOCTOR_YEARS`, `DOCTOR_FEE_INR`, then
   `npm run db:seed --workspace @carelink/api`. Repeat per doctor. (Seeded doctors
   are created already‑verified; patients self‑register.)
4. **Cloudinary / SMTP / Sentry**: create, copy keys.
5. **Cloudflare R2**: create bucket + S3 API token.
6. **Vercel**: import the repo twice (`carelink-api` root `apps/api`, `carelink-web`
   root `apps/web`). Add env vars from §2 / §3. Deploy.
7. **DNS**: point `api.` and `app.` at the two Vercel projects; add them as custom
   domains in Vercel.
8. **GitHub**: add the Actions secrets/vars from §4. Manually run `cron.yml` once
   (`workflow_dispatch`) — expect `200`.
9. **Smoke test**: register a patient → verify email → find the seeded doctor →
   book → open consult → send a chat message → doctor issues a prescription →
   patient downloads the PDF → start a video call.

---

## 6. Gotchas

- **Cookie auth across `*.vercel.app`**: `vercel.app` is on the public‑suffix list,
  so `carelink-web.vercel.app` and `carelink-api.vercel.app` count as *different
  sites* — cookie auth then needs `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true`.
  Much simpler: use a real domain with `app.` / `api.` subdomains and keep
  `SAMESITE=lax`.
- **Migrations use `DIRECT_URL`** (port 5432), not the pooled URL — drizzle‑kit
  needs a non‑pgBouncer connection.
- **Supabase 7‑day pause** is only prevented while `cron.yml` is running — don’t
  disable it.
- **`pg_dump` version**: the backup workflow installs `postgresql-client-16` to
  match Supabase; don’t downgrade it.
- **No `CLOUDINARY_URL`** is a valid production choice — prescriptions still work,
  the PDF is just regenerated on each download instead of stored.
- **Compliance before real patients** (PLAN §3): publish the privacy notice +
  teleconsent copy, and confirm the Supabase region + R2 are acceptable for the
  data you hold. No free tier signs a DPA.
