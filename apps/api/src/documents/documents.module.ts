import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentProcessingService } from './document-processing.service';
import { DocumentQueueService } from './document-queue.service';

@Module({
  imports: [AuthModule, AnalysisModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentProcessingService, DocumentQueueService, JwtAuthGuard],
})
export class DocumentsModule {}