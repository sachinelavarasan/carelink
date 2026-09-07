import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { API_PREFIX } from '@carelink/shared';
import { AppModule } from './app.module';
import { SentryExceptionFilter } from './observability/sentry.filter';
import { initSentry } from './observability/sentry';

export async function createApp(): Promise<INestApplication> {
  initSentry();

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  app.use(helmet());
  app.use(cookieParser());
  // Everything is namespaced under `/api/v1`, except the root `/` status card.
  app.setGlobalPrefix(API_PREFIX.replace(/^\//, ''), { exclude: ['/'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new SentryExceptionFilter(app.getHttpAdapter()));

  // `*` → reflect the request Origin (required: `credentials: true` forbids a
  // literal `*`). Otherwise treat CORS_ORIGINS as a comma-separated allow-list.
  const raw = (process.env.CORS_ORIGINS ?? 'http://localhost:5173').trim();
  const origin =
    raw === '*' ? true : raw.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  return app;
}
