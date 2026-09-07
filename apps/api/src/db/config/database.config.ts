import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { PoolConfig } from 'pg';

import { Env } from '../../env.interface';

config();

const configService = new ConfigService<Env>();

const isProd = configService.get('NODE_ENV') === 'production';

const connectionOptions: PoolConfig = {
  host: configService.get('DB_HOST'),
  user: configService.get('DB_USER'),
  database: configService.get('DB_NAME'),
  password: configService.get('DB_PASSWORD'),
  port: Number(configService.get('DB_PORT')) || 5432,
  // Managed Postgres (Neon/Supabase) requires TLS; their pooler certs don't
  // chain to a root the Node bundle trusts, so don't reject on verification.
  ssl: isProd ? { rejectUnauthorized: false } : false,
};

export default connectionOptions;
