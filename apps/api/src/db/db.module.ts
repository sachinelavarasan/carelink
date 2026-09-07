import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import connectionOptions from './config/database.config';
import { DB } from './database.constants';
import { DatabaseService } from './database.service';

import type { Database } from './types/Database';
import type { Env } from '../env.interface';

import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env>): Database => {
        const connection = new Pool(connectionOptions);
        return {
          connection,
          db: drizzle(connection, {
            schema,
            logger: configService.get('DEBUG') === 'true',
          }),
        };
      },
    },
    DatabaseService,
  ],
  exports: [DB, DatabaseService],
})
export class DbModule {}

export { DB } from './database.constants';
