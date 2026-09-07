import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import type { UserRole } from '@carelink/shared';
import { AuditService } from './audit.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
/** High-frequency, zero investigative value — kept out of the audit table. */
const SKIP_ACTIONS = new Set(['POST /api/v1/auth/refresh']);

interface AuditRequest {
  method: string;
  originalUrl?: string;
  url: string;
  route?: { path?: string };
  params?: Record<string, string>;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
  user?: { id: string; role: UserRole };
}

/** Writes one `audit_logs` row per successful mutating request. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest<AuditRequest>();
    if (!MUTATING.has(req.method)) return next.handle();

    const routePath = req.route?.path ?? stripQuery(req.originalUrl ?? req.url);
    const action = `${req.method} ${routePath}`;
    if (SKIP_ACTIONS.has(action)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const { entityType, entityId } = describe(routePath, req.params ?? {});
        void this.audit.record({
          actorUserId: req.user?.id ?? null,
          action,
          entityType,
          entityId,
          ip: clientIp(req),
          userAgent: firstHeader(req.headers['user-agent']),
        });
      }),
    );
  }
}

function stripQuery(url: string): string {
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

function describe(
  routePath: string,
  params: Record<string, string>,
): { entityType: string; entityId: string } {
  const segments = routePath.split('/').filter(Boolean); // ['api','v1','prescriptions',':id',...]
  const entityType = segments[2] ?? 'unknown';
  const entityId =
    params.id ??
    params.appointmentId ??
    params.threadId ??
    params.patientId ??
    Object.values(params)[0] ??
    '-';
  return { entityType, entityId };
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function clientIp(req: AuditRequest): string | null {
  const fwd = firstHeader(req.headers['x-forwarded-for']);
  if (fwd) return fwd.split(',')[0].trim();
  return req.ip ?? req.socket?.remoteAddress ?? null;
}
