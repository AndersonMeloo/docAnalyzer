import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnalysisService } from './analysis.service';
import { ProcessSummaryService } from './process-summary.service';

@Module({ imports: [AiModule], providers: [AnalysisService, ProcessSummaryService], exports: [AnalysisService, ProcessSummaryService] })
export class AnalysisModule {}