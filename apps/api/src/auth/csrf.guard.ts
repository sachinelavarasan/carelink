import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ACCESS_COOKIE, CSRF_COOKIE } from './cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF check for cookie-authenticated (web) requests.
 * Bearer-token requests (mobile) and safe methods are exempt. Requests that
 * carry no auth cookie (e.g. login) are also exempt — there's no session to forge.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & { cookies?: Record<string, string | undefined> }
    >();

    if (SAFE_METHODS.has(req.method)) return true;
    if ((req.headers.authorization ?? '').startsWith('Bearer ')) return true;

    const cookies = req.cookies ?? {};
    if (!cookies[ACCESS_COOKIE]) return true;

    const cookieToken = cookies[CSRF_COOKIE];
    const headerToken = req.headers['x-csrf-token'];
    if (!cookieToken || typeof headerToken !== 'string' || headerToken !== cookieToken) {
      throw new ForbiddenException('missing or invalid CSRF token');
    }
    return true;
  }
}
