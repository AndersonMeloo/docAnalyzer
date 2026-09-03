import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnalysisModule } from '../analysis/analysis.module';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';

@Module({
  imports: [AuthModule, AnalysisModule],
  controllers: [ProcessesController],
  providers: [ProcessesService, JwtAuthGuard],
})
export class ProcessesModule {}
