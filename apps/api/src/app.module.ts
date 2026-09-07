import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './auth/csrf.guard';
import { AvailabilityModule } from './availability/availability.module';
// import { ChatModule } from './chat/chat.module'; // hidden for now
import { loadConfig } from './config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { RootModule } from './root/root.module';
import { StorageModule } from './storage/storage.module';
import { UsersModule } from './users/users.module';
import { VideoModule } from './video/video.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: (env) => loadConfig(env as NodeJS.ProcessEnv),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    DbModule,
    AuditModule,
    MailModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    AvailabilityModule,
    AppointmentsModule,
    // ChatModule, // hidden for now
    VideoModule,
    PrescriptionsModule,
    JobsModule,
    HealthModule,
    RootModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // CSRF double-submit guard. Temporarily switchable off via CSRF_DISABLED=true
    // while the web app and API are on different sites: stale cross-site cookies
    // trip the check on POST /auth/login and surface as a bogus 403. Remove the
    // flag once the Vercel same-origin proxy is live.
    ...(process.env.CSRF_DISABLED === 'true'
      ? []
      : [{ provide: APP_GUARD, useClass: CsrfGuard }]),
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
