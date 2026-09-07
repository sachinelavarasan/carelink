import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  sendMessageSchema,
  threadMessagesQuerySchema,
  type Message,
  type MessagesPage,
  type SendMessageInput,
  type ThreadMessagesQuery,
  type ThreadView,
} from '@carelink/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ChatService } from './chat.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('appointments/:appointmentId/thread')
  thread(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<ThreadView> {
    return this.chat.threadForAppointment(user, appointmentId);
  }

  @Get('threads/:threadId/messages')
  history(
    @CurrentUser() user: AuthUser,
    @Param('threadId') threadId: string,
    @Query(new ZodValidationPipe(threadMessagesQuerySchema)) query: ThreadMessagesQuery,
  ): Promise<MessagesPage> {
    return this.chat.history(user, threadId, query);
  }

  @Post('messages')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  send(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ): Promise<Message> {
    return this.chat.send(user, body);
  }
}
