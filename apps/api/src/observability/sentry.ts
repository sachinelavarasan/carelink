import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

let started = false;

/**
 * Initialises Sentry once, only when `SENTRY_DSN` is set. Safe to call in every
 * environment — a no-op without the DSN, and `Sentry.captureException` is inert
 * until this runs.
 */
export function initSentry(env: NodeJS.ProcessEnv = process.env): boolean {
  if (started) return true;
  const dsn = env.SENTRY_DSN;
  if (!dsn) {
    new Logger('Sentry').log('SENTRY_DSN not set — error tracking disabled.');
    return false;
  }
  Sentry.init({
    dsn,
    environment: env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
  });
  started = true;
  new Logger('Sentry').log('error tracking enabled.');
  return true;
}

export { Sentry };
