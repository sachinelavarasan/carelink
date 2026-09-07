import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { DB } from './database.constants';
import { DatabaseService } from './database.service';
import { Database } from './types/Database';

import * as schema from './schema';

import type { AppConfig } from '../config';

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>): Database => {
        const url =
          configService.get('DATABASE_URL', { infer: true }) ?? process.env.DATABASE_URL;
        if (!url) {
          throw new Error('DATABASE_URL is not set');
        }
        const connection = postgres(url, {
          max: Number(process.env.DB_POOL_MAX ?? 1),
          idle_timeout: 20,
          prepare: false, // required for pgBouncer transaction pooling
        });
        return {
          connection,
          db: drizzle(connection, {
            schema,
            logger: configService.get('NODE_ENV', { infer: true }) === 'development',
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
