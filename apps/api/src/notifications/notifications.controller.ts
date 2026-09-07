import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { registerPushTokenSchema, type RegisterPushTokenInput } from '@carelink/shared';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('me/push-tokens')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post()
  async register(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(registerPushTokenSchema)) body: RegisterPushTokenInput,
  ): Promise<{ ok: true }> {
    await this.notifications.registerPushToken(user.id, body.token, body.platform);
    return { ok: true };
  }
}
