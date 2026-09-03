import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({ imports: [AiModule, AuthModule], controllers: [ConversationsController], providers: [ConversationsService, JwtAuthGuard] })
export class ConversationsModule {}