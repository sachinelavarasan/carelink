import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import type { AuthTokens } from '@carelink/shared';
import type { AppConfig } from '../config';

export const ACCESS_COOKIE = 'carelink_access';
export const CSRF_COOKIE = 'carelink_csrf';

@Injectable()
export class CookieService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /** Sets the httpOnly access cookie and a readable CSRF cookie, both living as
   *  long as the access token. */
  setAuthCookies(res: Response, tokens: AuthTokens): void {
    const secure =
      this.config.get('COOKIE_SECURE', { infer: true }) ??
      this.config.get('NODE_ENV', { infer: true }) === 'production';
    // A Secure cookie almost always means the web app and API sit on different
    // sites (two *.vercel.app subdomains, a separate API host); the browser only
    // keeps such a cookie from a cross-site XHR when it is SameSite=None. Fall
    // back to Lax for local http dev, where None would be rejected.
    const sameSite =
      this.config.get('COOKIE_SAMESITE', { infer: true }) ?? (secure ? 'none' : 'lax');
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    const maxAge = tokens.expiresIn * 1000;

    const base = { secure, sameSite, domain, path: '/', maxAge } as const;

    res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...base, httpOnly: true });
    res.cookie(CSRF_COOKIE, randomBytes(24).toString('hex'), { ...base, httpOnly: false });
  }

  clearAuthCookies(res: Response): void {
    const domain = this.config.get('COOKIE_DOMAIN', { infer: true });
    for (const name of [ACCESS_COOKIE, CSRF_COOKIE]) {
      res.clearCookie(name, { domain, path: '/' });
    }
  }
}
