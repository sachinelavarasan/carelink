import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { UserRole } from '@carelink/shared';

export interface AuthUser {
  id: string;
  role: UserRole;
}

/** Reads the user attached by `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without JwtAuthGuard');
    }
    return request.user;
  },
);
