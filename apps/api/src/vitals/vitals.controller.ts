import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { vitalEntrySchema, type Vital, type VitalEntryInput, type VitalsList } from '@carelink/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { VitalsService } from './vitals.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VitalsController {
  constructor(private readonly vitals: VitalsService) {}

  @Get('me/vitals')
  @Roles('PATIENT')
  listOwn(@CurrentUser() user: AuthUser): Promise<VitalsList> {
    return this.vitals.listOwn(user.id);
  }

  @Post('me/vitals')
  @Roles('PATIENT')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  add(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(vitalEntrySchema)) body: VitalEntryInput,
  ): Promise<Vital> {
    return this.vitals.add(user.id, body);
  }

  @Delete('me/vitals/:id')
  @Roles('PATIENT')
  @HttpCode(200)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.vitals.remove(user.id, id);
    return { ok: true };
  }

  @Get('patients/:patientId/vitals')
  @Roles('DOCTOR')
  listForPatient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ): Promise<VitalsList> {
    return this.vitals.listForPatient(user.id, patientId);
  }
}
