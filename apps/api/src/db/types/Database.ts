import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';

import type * as schema from '../schema';

export type Database = {
  connection: postgres.Sql;
  db: PostgresJsDatabase<typeof schema>;
};
