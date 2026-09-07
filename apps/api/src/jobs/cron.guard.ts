import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppConfig } from '../config';

/** Guards `/jobs/*`: requires `x-cron-secret` to match `CRON_SECRET`. */
@Injectable()
export class CronGuard implements CanActivate {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get('CRON_SECRET', { infer: true });
    const isProd = this.config.get('NODE_ENV', { infer: true }) === 'production';

    if (!secret) {
      if (isProd) throw new UnauthorizedException('CRON_SECRET not configured');
      return true; // dev convenience
    }

    const req = context.switchToHttp().getRequest<Request>();
    if (req.headers['x-cron-secret'] !== secret) {
      throw new UnauthorizedException('bad cron secret');
    }
    return true;
  }
}
