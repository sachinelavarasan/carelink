import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let cached: { client: postgres.Sql; db: Db } | undefined;

/**
 * Returns a singleton Drizzle client for standalone scripts (seeds, migrations)
 * that run outside the Nest DI container. Inside the app, inject the `DB`
 * provider from `db.module.ts` instead. On Vercel serverless the module is
 * reused across warm invocations, so we keep one small pool. Point DATABASE_URL
 * at Supabase's pooled (pgBouncer, port 6543) connection string.
 */
export function getDb(connectionString = process.env.DATABASE_URL): Db {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!cached) {
    const client = postgres(connectionString, {
      max: Number(process.env.DB_POOL_MAX ?? 1),
      idle_timeout: 20,
      prepare: false, // required for pgBouncer transaction pooling
    });
    cached = { client, db: drizzle(client, { schema }) };
  }
  return cached.db;
}

export { schema };
export type { Database } from './types/Database';
