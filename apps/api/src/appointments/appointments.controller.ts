import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  type Appointment,
  type AppointmentPage,
  type AppointmentSummary,
  type CancelAppointmentInput,
  type CreateAppointmentInput,
  type ListAppointmentsQuery,
  type RescheduleAppointmentInput,
} from '@carelink/shared';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { Roles } from '../common/roles.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @Roles('PATIENT')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  book(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAppointmentSchema)) body: CreateAppointmentInput,
  ): Promise<Appointment> {
    return this.appointments.book(user.id, body);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(listAppointmentsQuerySchema)) query: ListAppointmentsQuery,
  ): Promise<AppointmentPage> {
    return this.appointments.list(user, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthUser): Promise<AppointmentSummary> {
    return this.appointments.summary(user);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Appointment> {
    return this.appointments.get(user, id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(cancelAppointmentSchema)) body: CancelAppointmentInput,
  ): Promise<Appointment> {
    return this.appointments.cancel(user, id, body.reason);
  }

  @Post(':id/reschedule')
  reschedule(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rescheduleAppointmentSchema)) body: RescheduleAppointmentInput,
  ): Promise<Appointment> {
    return this.appointments.reschedule(user, id, body.scheduledStart);
  }

  @Post(':id/verify-identity')
  @Roles('DOCTOR')
  verifyIdentity(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<Appointment> {
    return this.appointments.verifyIdentity(user, id);
  }
}
