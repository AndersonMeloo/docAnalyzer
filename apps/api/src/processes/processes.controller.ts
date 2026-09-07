import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProcessSummaryService } from '../analysis/process-summary.service';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { CreateProcessDto } from './dto/create-process.dto';
import { ProcessesService } from './processes.service';

@UseGuards(JwtAuthGuard)
@Controller('processes')
export class ProcessesController {
  constructor(private readonly processesService: ProcessesService, private readonly summaryService: ProcessSummaryService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.processesService.listByOwner(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateProcessDto) {
    return this.processesService.create(user.userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.processesService.remove(user.userId, id);
  }
  
  @Patch(':id/complete')
  complete(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.processesService.complete(user.userId, id);
  }
  
  @Patch(':id/reopen')
  reopen(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.processesService.reopen(user.userId, id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.processesService.findOwned(user.userId, id);
  }

  @Get(':id/summary')
  summary(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.summaryService.getOrCreate(user.userId, id);
  }

  @Post(':id/summary/refresh')
  refreshSummary(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.summaryService.refresh(user.userId, id);
  }
}
