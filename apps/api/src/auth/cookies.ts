import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthTokens } from '@carelink/shared';
import { durationToMs } from '../common/duration';
import type { AppConfig } from '../config';

export const ACCESS_COOKIE = 'carelink_access';
export const REFRESH_COOKIE = 'carelink_refresh';
export const CSRF_COOKIE = 'carelink_csrf';

@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /** Sets httpOnly access + refresh cookies and a readable CSRF cookie. */
  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const secure =
      this.config.get('COOKIE_SECURE', { infer: true }) ??
      this.config.get('NODE_ENV', { infer: true }) === 'production';
    const sameSite = this.config.get('COOKIE_SAMESITE', { infer: true });
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    const refreshMaxAge = durationToMs(this.config.get('JWT_REFRESH_TTL', { infer: true }));

    const base = { secure, sameSite, domain, path: '/' } as const;

    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...base,
      httpOnly: true,
      maxAge: tokens.expiresIn * 1000,
    });
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...base,
      httpOnly: true,
      maxAge: refreshMaxAge,
    });
    res.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), {
      ...base,
      httpOnly: false,
      maxAge: refreshMaxAge,
    });
  }

  clearAuthCookies(res: Response): void {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, CSRF_COOKIE]) {
      res.clearCookie(name, { domain, path: '/' });
    }
  }
}
