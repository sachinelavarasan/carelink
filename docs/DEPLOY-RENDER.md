# Deploying the API on Render

The API (`apps/api`) is a NestJS server. On Render it runs as a **Web Service**
(long-lived Node process), not serverless — `src/main.ts` listens on
`process.env.PORT` and binds `0.0.0.0`. The `apps/api/api/index.ts` +
`serverless-http` handler is Vercel-only and unused here.

Everything is captured in [`render.yaml`](../render.yaml) at the repo root. You
can either sync that Blueprint or set the service up by hand.

## Option A — Blueprint (recommended)

1. Push `render.yaml` to the repo.
2. Render dashboard → **New → Blueprint** → pick this repo.
3. Render creates `carelink-api`. Fill the vars marked `sync: false` (below).
4. First deploy: run migrations once (see [Migrations](#migrations)).

## Option B — Manual Web Service

| Setting | Value |
| --- | --- |
| Environment | Node |
| Region | Singapore (match Supabase `ap-southeast-1`) |
| Root Directory | *(blank — repo root)* |
| Build Command | `npm ci --include=dev && npm run build --workspace @carelink/shared && npm run build --workspace @carelink/api` |
| Start Command | `npm run start --workspace @carelink/api` |
| Health Check Path | `/api/v1/healthz` |

`--include=dev` is required: `@nestjs/cli`, `tsup`, and `tsx` are
devDependencies and the build/migrations need them even with
`NODE_ENV=production`.

## Environment variables

Set in the Render dashboard (Environment tab). Full reference:
[`apps/api/.env.example`](../apps/api/.env.example).

**Required**

| Var | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase **pooled** string — pgBouncer, port `6543`, `?pgbouncer=true` |
| `DIRECT_URL` | Supabase **direct** string — port `5432` (migrations only) |
| `DB_POOL_MAX` | `5` (persistent server, unlike the serverless `1`) |
| `JWT_ACCESS_SECRET` | random 32+ chars |
| `JWT_REFRESH_SECRET` | random 32+ chars, different from above |
| `APP_WEB_URL` | the deployed web app URL (used in email links) |
| `CORS_ORIGINS` | the deployed web app origin(s), comma-separated |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `none` — web app and API are on different sites |
| `CRON_SECRET` | random 16+ chars (guards `POST /jobs/run`) |

`COOKIE_DOMAIN` stays unset — the web and API live on different registrable
domains (`*.vercel.app` vs `*.onrender.com`), so a shared cookie domain isn't
possible; the browser keeps the API's cookies against the API host and sends
them cross-site because of `SameSite=None; Secure`.

**Optional** — `SMTP_*` + `MAIL_FROM` (unset ⇒ links log to stdout),
`CLOUDINARY_URL`, `SENTRY_DSN`, `JITSI_DOMAIN`.

## Migrations

Drizzle migrations are **not** run at boot. Apply them against `DIRECT_URL`:

- **Starter plan or higher** — uncomment `preDeployCommand` in `render.yaml`:
  ```
  npm run db:migrate --workspace @carelink/api
  ```
  It runs after each build, before traffic switches over.

- **Free plan** (no pre-deploy) — run once from your machine whenever the
  schema changes, pointing at the same DB:
  ```bash
  DIRECT_URL='<supabase direct url>' npm run db:migrate --workspace @carelink/api
  ```
  or use the service's **Shell** tab: `npm run db:migrate --workspace @carelink/api`.

Seed the doctor account the same way (`npm run db:seed --workspace @carelink/api`
with `DOCTOR_EMAIL` / `DOCTOR_PASSWORD` set).

## Scheduled jobs

`POST /api/v1/jobs/run` (header `x-cron-secret: $CRON_SECRET`) sends due
reminders and pings the DB. Run it every 5 min:

- **Free** — the existing [`.github/workflows/cron.yml`](../.github/workflows/cron.yml).
  Uncomment it, add repo **secret** `CRON_SECRET` and repo **variable**
  `API_BASE_URL` = `https://carelink-api.onrender.com`.
- **Paid** — a Render Cron Job (commented template at the bottom of
  `render.yaml`).

## Notes

- **Free instances sleep** after ~15 min idle; the first request then takes
  ~30–60s while it wakes. The GitHub Actions cron above doubles as a keep-warm.
- Build output is `apps/api/dist/src/main.js` (the tsconfig compiles both `src/`
  and `api/`, so `dist/` gets a `src/` subdir).
- Point `apps/web` at `https://carelink-api.onrender.com` and add that origin to
  `CORS_ORIGINS`.
