import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),

  // Database (Postgres) — required. The app runtime (src/db/db.module.ts), the
  // migrator and the seed all connect with these discrete credentials via
  // src/db/config/*.config.ts. DATABASE_URL/DIRECT_URL are optional and only
  // consumed by the standalone getDb() helper in src/db/index.ts.
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DEBUG: z.enum(['true', 'false']).optional(),
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  // Our own auth — required
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Transactional email (Nodemailer SMTP) — optional; if unset, the mailer logs
  // links to the console instead of sending (fine for early local dev).
  SMTP_HOST: z.string().min(1).optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('CareLink <no-reply@carelink.app>'),

  // Links in emails point here
  APP_WEB_URL: z.string().url().default('http://localhost:5173'),

  // Web auth cookies. SECURE defaults to (NODE_ENV === production). SAMESITE, if
  // unset, follows SECURE: `none` for a secure (cross-site, e.g. two *.vercel.app
  // subdomains) deployment, `lax` for local http dev. Set it explicitly to pin.
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional(),
  COOKIE_DOMAIN: z.string().min(1).optional(),

  // File storage (Cloudinary) — holds prescription PDFs (M4) and, later, chat
  // attachments + medical documents. Optional: if unset, prescriptions still
  // finalise and the PDF is rendered on demand by GET /prescriptions/:id/pdf;
  // it just isn't persisted anywhere.
  // Either set CLOUDINARY_URL directly, or supply the three discrete parts below
  // (CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET) and loadConfig() assembles
  // CLOUDINARY_URL from them — same pattern as DATABASE_URL from the DB_* parts.
  CLOUDINARY_URL: z
    .string()
    .regex(/^cloudinary:\/\/.+/, 'expected cloudinary://<api_key>:<api_secret>@<cloud_name>')
    .optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_FOLDER: z.string().min(1).default('carelink'),
  // Signed-URL lifetime for private files, seconds.
  FILE_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),

  // Video consultation (Jitsi). meet.jit.si for the pilot; a self-hosted domain later.
  JITSI_DOMAIN: z.string().min(1).default('meet.jit.si'),

  // Error tracking (Sentry) — optional; unset = disabled.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0),

  // Jobs / cron
  CRON_SECRET: z.string().min(16).optional(),

  // CORS (comma-separated)
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // Treat empty-string vars (common in a copied .env) as unset.
  const cleaned = Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, value === '' ? undefined : value]),
  );

  // The app, migrator and seed connect with the discrete DB_* credentials (see
  // src/db/config/{database,migration}.config.ts). Assemble DATABASE_URL from
  // those parts when it isn't set directly, so the standalone getDb() helper in
  // src/db/index.ts keeps working off a single set of vars.
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = cleaned;
  if (!cleaned.DATABASE_URL && DB_HOST && DB_PORT && DB_NAME && DB_USER && DB_PASSWORD) {
    const url = `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(
      DB_PASSWORD,
    )}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    cleaned.DATABASE_URL = url;
    cleaned.DIRECT_URL ??= url;
    process.env.DATABASE_URL ??= url;
    process.env.DIRECT_URL ??= url;
  }

  // Assemble CLOUDINARY_URL from its discrete parts when not set directly. The
  // Cloudinary SDK reads CLOUDINARY_URL straight off process.env, so mirror it there.
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = cleaned;
  if (
    !cleaned.CLOUDINARY_URL &&
    CLOUDINARY_CLOUD_NAME &&
    CLOUDINARY_API_KEY &&
    CLOUDINARY_API_SECRET
  ) {
    const url = `cloudinary://${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}@${CLOUDINARY_CLOUD_NAME}`;
    cleaned.CLOUDINARY_URL = url;
    // Overwrite unconditionally: a copied .env often carries CLOUDINARY_URL="" ,
    // which is not nullish, so `??=` would leave the SDK with an empty string.
    process.env.CLOUDINARY_URL = url;
  }

  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n${issues.join('\n')}`);
  }
  return parsed.data;
}

/** True when SMTP is fully configured; the mailer uses this to decide send vs. log. */
export function smtpConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.SMTP_HOST && cfg.SMTP_USER && cfg.SMTP_PASS);
}

/**
 * True when Cloudinary is configured; StorageService persists files only then.
 * CLOUDINARY_URL is assembled from the discrete parts in loadConfig(), so this
 * one check covers both ways of supplying credentials.
 */
export function storageConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.CLOUDINARY_URL);
}
