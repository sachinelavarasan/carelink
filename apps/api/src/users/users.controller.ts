import { Body, Controller, Delete, Get, HttpCode, Put, UseGuards } from '@nestjs/common';
import {
  deleteAccountSchema,
  doctorProfileSchema,
  patientProfileSchema,
  type DeleteAccountInput,
  type DoctorProfileInput,
  type DoctorProfileOut,
  type Me,
  type PatientProfileInput,
  type PatientProfileOut,
} from '@carelink/shared';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser): Promise<Me> {
    return this.users.getMe(user.id);
  }

  @Put('me/patient-profile')
  upsertPatientProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(patientProfileSchema)) body: PatientProfileInput,
  ): Promise<PatientProfileOut> {
    return this.users.upsertPatientProfile(user.id, body);
  }

  @Put('me/doctor-profile')
  @Roles('DOCTOR')
  upsertDoctorProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(doctorProfileSchema)) body: DoctorProfileInput,
  ): Promise<DoctorProfileOut> {
    return this.users.upsertDoctorProfile(user.id, body);
  }

  /** DPDP erasure. PATIENT only — doctor removal is a manual ops task. */
  @Delete('me')
  @Roles('PATIENT')
  @HttpCode(200)
  deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(deleteAccountSchema)) body: DeleteAccountInput,
  ): Promise<{ ok: true }> {
    return this.users.deleteAccount(user.id, body.password);
  }
}
