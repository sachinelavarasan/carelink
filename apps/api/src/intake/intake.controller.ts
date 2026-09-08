import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  appointmentIntakeSchema,
  type AppointmentIntakeInput,
  type AppointmentIntakeView,
} from '@carelink/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { IntakeService } from './intake.service';

@Controller('appointments/:appointmentId/intake')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<AppointmentIntakeView | null> {
    return this.intake.get(user, appointmentId);
  }

  @Put()
  @Roles('PATIENT')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body(new ZodValidationPipe(appointmentIntakeSchema)) body: AppointmentIntakeInput,
  ): Promise<AppointmentIntakeView> {
    return this.intake.upsert(user, appointmentId, body);
  }
}
