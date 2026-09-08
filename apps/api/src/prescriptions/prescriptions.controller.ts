import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createPrescriptionSchema,
  cursorQuerySchema,
  medicalHistoryQuerySchema,
  prescriptionTemplateBodySchema,
  updatePrescriptionSchema,
  type CreatePrescriptionInput,
  type CursorQuery,
  type MedicalHistory,
  type MedicalHistoryQuery,
  type PrescriptionTemplate,
  type PrescriptionTemplateInput,
  type PrescriptionView,
  type UpdatePrescriptionInput,
} from '@carelink/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrescriptionsService } from './prescriptions.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionsController {
  constructor(
    private readonly prescriptions: PrescriptionsService,
    private readonly templates: PrescriptionTemplatesService,
  ) {}

  /* ------------------------------------------------ reusable templates (doctor) */

  @Get('me/prescription-templates')
  @Roles('DOCTOR')
  listTemplates(@CurrentUser() user: AuthUser): Promise<PrescriptionTemplate[]> {
    return this.templates.list(user.id);
  }

  @Post('me/prescription-templates')
  @Roles('DOCTOR')
  createTemplate(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(prescriptionTemplateBodySchema)) body: PrescriptionTemplateInput,
  ): Promise<PrescriptionTemplate> {
    return this.templates.create(user.id, body);
  }

  @Patch('me/prescription-templates/:id')
  @Roles('DOCTOR')
  updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(prescriptionTemplateBodySchema)) body: PrescriptionTemplateInput,
  ): Promise<PrescriptionTemplate> {
    return this.templates.update(user.id, id, body);
  }

  @Delete('me/prescription-templates/:id')
  @Roles('DOCTOR')
  @HttpCode(200)
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    await this.templates.remove(user.id, id);
    return { ok: true };
  }

  @Post('prescriptions')
  @Roles('DOCTOR')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createPrescriptionSchema)) body: CreatePrescriptionInput,
  ): Promise<PrescriptionView> {
    return this.prescriptions.create(user, body);
  }

  @Patch('prescriptions/:id')
  @Roles('DOCTOR')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePrescriptionSchema)) body: UpdatePrescriptionInput,
  ): Promise<PrescriptionView> {
    return this.prescriptions.update(user, id, body);
  }

  @Post('prescriptions/:id/finalize')
  @Roles('DOCTOR')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  finalize(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PrescriptionView> {
    return this.prescriptions.finalize(user, id);
  }

  @Get('prescriptions/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<PrescriptionView> {
    return this.prescriptions.get(user, id);
  }

  @Get('prescriptions/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  async pdf(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.prescriptions.pdf(user, id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
    });
  }

  @Get('appointments/:appointmentId/prescription')
  forAppointment(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<PrescriptionView> {
    return this.prescriptions.getForAppointment(user, appointmentId);
  }

  @Get('medical-history')
  @Roles('PATIENT')
  myHistory(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(medicalHistoryQuerySchema)) query: MedicalHistoryQuery,
  ): Promise<MedicalHistory> {
    return this.prescriptions.myHistory(user, query);
  }

  @Get('patients/:patientId/history')
  @Roles('DOCTOR')
  patientHistory(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
    @Query(new ZodValidationPipe(cursorQuerySchema)) query: CursorQuery,
  ): Promise<MedicalHistory> {
    return this.prescriptions.patientHistory(user, patientId, query);
  }
}
