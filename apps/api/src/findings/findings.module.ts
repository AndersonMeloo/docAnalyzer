import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { FindingsController } from './findings.controller';
import { FindingsService } from './findings.service';

@Module({ imports: [AuthModule], controllers: [FindingsController], providers: [FindingsService, JwtAuthGuard] })
export class FindingsModule {}