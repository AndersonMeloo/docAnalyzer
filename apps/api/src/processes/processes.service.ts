import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { ProcessStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateProcessDto } from './dto/create-process.dto';

@Injectable()
export class ProcessesService {
  constructor(private readonly prisma: PrismaService) {}

  listByOwner(ownerId: string) {
    return this.prisma.process.findMany({
      where: { ownerId },
      include: { _count: { select: { documents: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  create(ownerId: string, dto: CreateProcessDto) {
    return this.prisma.process.create({
      data: { ownerId, name: dto.name.trim(), identifier: dto.identifier?.trim() || null, status: ProcessStatus.PROCESSANDO },
    });
  }

  async findOwned(ownerId: string, processId: string) {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    return process;
  }

  async remove(ownerId: string, processId: string): Promise<{ message: string }> {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, include: { documents: { select: { storagePath: true } } } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    await this.prisma.process.delete({ where: { id: processId } });
    await Promise.all(process.documents.map((document) => unlink(document.storagePath).catch(() => undefined)));
    return { message: 'Processo removido.' };
  }
}
