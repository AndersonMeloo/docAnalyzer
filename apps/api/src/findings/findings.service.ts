import { Injectable, NotFoundException } from '@nestjs/common';
import { FindingStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpdateFindingDto } from './dto/update-finding.dto';

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(ownerId: string, processId: string) {
    await this.assertProcess(ownerId, processId);
    return this.prisma.finding.findMany({ where: { processId }, include: { document: { select: { originalName: true } } }, orderBy: [{ status: 'asc' }, { severity: 'desc' }, { createdAt: 'desc' }] });
  }

  async update(ownerId: string, processId: string, findingId: string, dto: UpdateFindingDto) {
    await this.assertProcess(ownerId, processId);
    const finding = await this.prisma.finding.findFirst({ where: { id: findingId, processId } });
    if (!finding) throw new NotFoundException('Ponto de atenção não encontrado.');
    return this.prisma.finding.update({ where: { id: findingId }, data: { status: dto.status } });
  }

  private async assertProcess(ownerId: string, processId: string) {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, select: { id: true } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
  }
}