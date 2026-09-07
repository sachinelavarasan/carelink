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
import { durationToSeconds } from '../common/duration';
import type { AppConfig } from '../config';
import { DB } from '../db/db.module';
import type { Database } from '../db';
import { users } from '../db/schema';
import { MailService } from '../mail/mail.service';

const BCRYPT_ROUNDS = 12;

/** One-off email links are stateless JWTs, scoped by a per-purpose secret so
 *  they can never be replayed as an access token (or as each other). */
type LinkPurpose = 'verify' | 'reset';

@Injectable()
export class AuthService {
  private get db() {
    return this.connection.db;
  }

  constructor(
    @Inject(DB) private readonly connection: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly mail: MailService,
  ) {}

  private purposeSecret(purpose: LinkPurpose): string {
    return `${this.config.get('JWT_ACCESS_SECRET', { infer: true })}:${purpose}`;
  }

  private signLink(userId: string, purpose: LinkPurpose, expiresIn: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, purpose },
      { secret: this.purposeSecret(purpose), expiresIn },
    );
  }

  private async readLink(token: string, purpose: LinkPurpose): Promise<string | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; purpose?: string }>(token, {
        secret: this.purposeSecret(purpose),
      });
      return payload.purpose === purpose && payload.sub ? payload.sub : null;
    } catch {
      return null;
    }
  }

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
    const userId = await this.readLink(token, 'verify');
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
    return this.issueAccessToken(user.id, user.role);
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ ok: true }> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, input.email),
      columns: { id: true },
    });
    if (user) {
      const raw = await this.signLink(user.id, 'reset', '1h');
      const url = `${this.webUrl()}/reset?token=${raw}`;
      await this.mail.sendPasswordResetEmail(input.email, url);
    }
    return { ok: true };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
    const userId = await this.readLink(input.token, 'reset');
    if (!userId) throw new BadRequestException('invalid or expired reset link');

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    await this.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
    return { ok: true };
  }

  private async issueAccessToken(userId: string, role: UserRole): Promise<AuthTokens> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: accessTtl,
      },
    );
    return { accessToken, expiresIn: durationToSeconds(accessTtl) };
  }

  private webUrl(): string {
    return this.config.get('APP_WEB_URL', { infer: true }).replace(/\/$/, '');
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const raw = await this.signLink(userId, 'verify', '24h');
    await this.mail.sendVerificationEmail(email, `${this.webUrl()}/verify?token=${raw}`);
  }
}
