import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { AppConfig } from '../config';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit(): void {
    const host = this.config.get('SMTP_HOST', { infer: true });
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — emails will be logged to the console, not sent.');
      return;
    }
    this.transporter = createTransport({
      host,
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      auth: { user, pass },
    });
  }

  async sendVerificationEmail(to: string, verifyUrl: string): Promise<void> {
    await this.send(
      to,
      'Verify your CareLink email',
      `Welcome to CareLink. Confirm your email address:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
    );
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.send(
      to,
      'Reset your CareLink password',
      `We received a request to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't ask for this, ignore this email.`,
    );
  }

  /** Generic transactional email (booking notices, reminders, …). No PHI in the body. */
  async sendGeneric(to: string, subject: string, text: string): Promise<void> {
    await this.send(to, subject, text);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to,
      subject,
      text,
    });
  }
}
