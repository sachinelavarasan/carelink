import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Res,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
  type AuthTokens,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@carelink/shared';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { CookieService } from './cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: CookieService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput): Promise<{ ok: true }> {
    return this.auth.register(body);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  resend(@Body() body: ForgotPasswordInput): Promise<{ ok: true }> {
    return this.auth.resendVerification(body.email);
  }

  @Get('verify')
  verify(
    @Query(new ZodValidationPipe(verifyEmailQuerySchema)) query: { token: string },
  ): Promise<{ ok: true }> {
    return this.auth.verifyEmail(query.token);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthTokens> {
    const tokens = await this.auth.login(body);
    this.cookies.setAuthCookies(res, tokens);
    return tokens;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    // Stateless tokens — logout just drops the browser's auth cookie. Mobile
    // clears its own stored token.
    this.cookies.clearAuthCookies(res);
    return { ok: true };
  }

  @Post('forgot')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  forgot(@Body() body: ForgotPasswordInput): Promise<{ ok: true }> {
    return this.auth.forgotPassword(body);
  }

  @Post('reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  reset(@Body() body: ResetPasswordInput): Promise<{ ok: true }> {
    return this.auth.resetPassword(body);
  }
}
