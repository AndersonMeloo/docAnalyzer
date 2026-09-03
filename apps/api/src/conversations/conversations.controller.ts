import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { ConversationsService } from './conversations.service';

@UseGuards(JwtAuthGuard)
@Controller('processes/:processId/conversation')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }, @Param('processId') processId: string) { return this.conversationsService.list(user.userId, processId); }

  @Post('messages')
  send(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @Body() dto: CreateMessageDto) { return this.conversationsService.send(user.userId, processId, dto); }

  @Delete()
  clear(@CurrentUser() user: { userId: string }, @Param('processId') processId: string) { return this.conversationsService.clear(user.userId, processId); }
}