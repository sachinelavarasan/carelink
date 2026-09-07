import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import type * as schema from '../schema';

export type Database = {
  connection: Pool;
  db: NodePgDatabase<typeof schema>;
};
