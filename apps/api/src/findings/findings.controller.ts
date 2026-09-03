import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { FindingsService } from './findings.service';

@UseGuards(JwtAuthGuard)
@Controller('processes/:processId/findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }, @Param('processId') processId: string) { return this.findingsService.list(user.userId, processId); }

  @Patch(':findingId')
  update(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @Param('findingId') findingId: string, @Body() dto: UpdateFindingDto) { return this.findingsService.update(user.userId, processId, findingId, dto); }
}