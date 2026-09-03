import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { AnalysisModule } from './analysis/analysis.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { DocumentsModule } from './documents/documents.module';
import { FindingsModule } from './findings/findings.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ProcessesModule } from './processes/processes.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), PrismaModule, AuthModule, AiModule, AnalysisModule, DocumentsModule, FindingsModule, ConversationsModule, ProcessesModule],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
