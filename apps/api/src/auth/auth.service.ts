import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import type {
  AuthTokens,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  UserRole,
} from '@carelink/shared';
import { durationToMs, durationToSeconds } from '../common/duration';
import type { AppConfig } from '../config';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { users } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { TokenService } from './token.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
  ) {}

  async register(input: RegisterInput): Promise<{ ok: true }> {
    const existing = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
      columns: { id: true },
    });
    if (existing) {
      // Don't reveal whether the email exists.
      return { ok: true };
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const [user] = await this.db
      .insert(users)
      .values({ email: input.email, passwordHash, fullName: input.fullName, role: 'PATIENT' })
      .returning({ id: users.id });

    await this.sendVerification(user.id, input.email);
    return { ok: true };
  }

  async resendVerification(email: string): Promise<{ ok: true }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email),
      columns: { id: true, emailVerifiedAt: true },
    });
    if (user && !user.emailVerifiedAt) {
      await this.sendVerification(user.id, email);
    }
    return { ok: true };
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    const userId = await this.tokens.consume(token, 'EMAIL_VERIFY');
    if (!userId) throw new BadRequestException('invalid or expired verification link');
    await this.db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
    return { ok: true };
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.db.query.users.findFirst({ where: eq(users.email, input.email) });
    const genericError = new UnauthorizedException('invalid email or password');
    if (!user || user.disabledAt) throw genericError;

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw genericError;

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('email not verified');
    }
    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const userId = await this.tokens.consume(refreshToken, 'REFRESH');
    if (!userId) throw new UnauthorizedException('invalid refresh token');

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, role: true, disabledAt: true },
    });
    if (!user || user.disabledAt) throw new UnauthorizedException('account unavailable');

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string): Promise<{ ok: true }> {
    await this.tokens.consume(refreshToken, 'REFRESH');
    return { ok: true };
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ ok: true }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
      columns: { id: true },
    });
    if (user) {
      const raw = await this.tokens.issue(user.id, 'PASSWORD_RESET', durationToMs('1h'));
      const url = `${this.webUrl()}/reset?token=${raw}`;
      await this.mail.sendPasswordResetEmail(input.email, url);
    }
    return { ok: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
    const userId = await this.tokens.consume(input.token, 'PASSWORD_RESET');
    if (!userId) throw new BadRequestException('invalid or expired reset link');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await this.tokens.revokeAll(userId, 'REFRESH');
    return { ok: true };
  }

  private async issueTokens(userId: string, role: UserRole): Promise<AuthTokens> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: accessTtl,
      },
    );
    const refreshToken = await this.tokens.issue(
      userId,
      'REFRESH',
      durationToMs(this.config.get('JWT_REFRESH_TTL', { infer: true })),
    );
    return { accessToken, refreshToken, expiresIn: durationToSeconds(accessTtl) };
  }

  private webUrl(): string {
    return this.config.get('APP_WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const raw = await this.tokens.issue(userId, 'EMAIL_VERIFY', durationToMs('24h'));
    await this.mail.sendVerificationEmail(email, `${this.webUrl()}/verify?token=${raw}`);
  }
}
