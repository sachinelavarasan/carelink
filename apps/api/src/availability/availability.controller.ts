import { Body, Controller, Delete, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import {
  availabilityExceptionSchema,
  listDoctorsQuerySchema,
  replaceAvailabilityRulesSchema,
  slotQuerySchema,
  type AvailabilityExceptionInput,
  type AvailabilityExceptionOut,
  type AvailabilityRuleOut,
  type DoctorPublic,
  type ListDoctorsQuery,
  type Slot,
  type ReplaceAvailabilityRulesInput,
  type VisitedDoctor,
  type VisitedPatient,
} from '@carelink/shared';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AvailabilityService } from './availability.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  /* ---- browsing (any authenticated user) ---- */

  @Get('doctors')
  listDoctors(
    @Query(new ZodValidationPipe(listDoctorsQuerySchema)) query: ListDoctorsQuery,
  ): Promise<DoctorPublic[]> {
    return this.availability.listDoctors(query);
  }

  @Get('doctors/specializations')
  listSpecializations(): Promise<string[]> {
    return this.availability.listSpecializations();
  }

  @Get('me/doctors')
  @Roles('PATIENT')
  visitedDoctors(@CurrentUser() user: AuthUser): Promise<VisitedDoctor[]> {
    return this.availability.visitedDoctors(user.id);
  }

  @Get('me/patients')
  @Roles('DOCTOR')
  visitedPatients(@CurrentUser() user: AuthUser): Promise<VisitedPatient[]> {
    return this.availability.visitedPatients(user.id);
  }

  @Get('doctors/:id')
  getDoctor(@Param('id') id: string): Promise<DoctorPublic> {
    return this.availability.getDoctor(id);
  }

  @Get('doctors/:id/slots')
  getSlots(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(slotQuerySchema)) query: { from: string; to: string },
  ): Promise<Slot[]> {
    return this.availability.getSlots(id, query.from, query.to);
  }

  /* ---- the doctor editing their own availability ---- */

  @Get('me/availability/rules')
  @Roles('DOCTOR')
  myRules(@CurrentUser() user: AuthUser): Promise<AvailabilityRuleOut[]> {
    return this.availability.listOwnRules(user.id);
  }

  @Put('me/availability/rules')
  @Roles('DOCTOR')
  replaceRules(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(replaceAvailabilityRulesSchema)) body: ReplaceAvailabilityRulesInput,
  ): Promise<AvailabilityRuleOut[]> {
    return this.availability.replaceRules(user.id, body);
  }

  @Get('me/availability/exceptions')
  @Roles('DOCTOR')
  myExceptions(@CurrentUser() user: AuthUser): Promise<AvailabilityExceptionOut[]> {
    return this.availability.listOwnExceptions(user.id);
  }

  @Put('me/availability/exceptions')
  @Roles('DOCTOR')
  upsertException(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(availabilityExceptionSchema)) body: AvailabilityExceptionInput,
  ): Promise<AvailabilityExceptionOut> {
    return this.availability.upsertException(user.id, body);
  }

  @Delete('me/availability/exceptions/:id')
  @Roles('DOCTOR')
  async deleteException(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.availability.deleteException(user.id, id);
    return { ok: true };
  }
}
