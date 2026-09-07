import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { VideoSession } from '@carelink/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { VideoService } from './video.service';

@Controller('appointments/:appointmentId/video')
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class VideoController {
  constructor(private readonly video: VideoService) {}

  @Get()
  get(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<VideoSession> {
    return this.video.getForAppointment(user, appointmentId);
  }

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<VideoSession> {
    return this.video.start(user, appointmentId);
  }

  @Post('end')
  end(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<VideoSession> {
    return this.video.end(user, appointmentId);
  }
}
