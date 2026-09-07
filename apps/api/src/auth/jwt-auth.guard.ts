import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@carelink/shared';
import type { AppConfig } from '../config';
import { ACCESS_COOKIE } from './cookies';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      cookies?: Record<string, string | undefined>;
      user?: { id: string; role: UserRole };
    }>();

    const header = request.headers.authorization ?? '';
    const [scheme, bearer] = header.split(' ');
    const token = scheme === 'Bearer' && bearer ? bearer : request.cookies?.[ACCESS_COOKIE];
    if (!token) {
      throw new UnauthorizedException('missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      });
      request.user = { id: payload.sub, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('invalid or expired token');
    }
  }
}
