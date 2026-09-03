import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalysisStatus } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ProcessSummaryResult {
  documentCount: number;
  pageCount: number;
  analyzedDocumentCount: number;
  pendingDocumentCount: number;
  summary: string | null;
  generatedAt: Date | null;
}

@Injectable()
export class ProcessSummaryService {
  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService) {}

  async getOrCreate(ownerId: string, processId: string): Promise<ProcessSummaryResult> {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, select: { id: true, name: true } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    const existing = await this.prisma.processSummary.findUnique({ where: { processId } });
    return existing ?? this.refresh(ownerId, processId);
  }

  async refresh(ownerId: string, processId: string): Promise<ProcessSummaryResult> {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, select: { id: true, name: true } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    const documents = await this.prisma.document.findMany({ where: { processId }, include: { analysis: { select: { status: true, summary: true } } } });
    const analyzed = documents.filter((document) => document.analysis?.status === AnalysisStatus.COMPLETED);
    const pending = documents.filter((document) => !document.isAiProtected && document.analysis?.status !== AnalysisStatus.COMPLETED);
    const summary = this.aiService.getStatus().configured && analyzed.length ? await this.generateSummary(process.name, analyzed.map((document) => `${document.originalName}: ${document.analysis?.summary ?? ''}`)) : null;
    return this.prisma.processSummary.upsert({
      where: { processId },
      create: { processId, documentCount: documents.length, pageCount: documents.reduce((total, document) => total + (document.pageCount ?? 0), 0), analyzedDocumentCount: analyzed.length, pendingDocumentCount: pending.length, summary, generatedAt: summary ? new Date() : null },
      update: { documentCount: documents.length, pageCount: documents.reduce((total, document) => total + (document.pageCount ?? 0), 0), analyzedDocumentCount: analyzed.length, pendingDocumentCount: pending.length, summary, generatedAt: summary ? new Date() : null },
    });
  }

  private generateSummary(processName: string, analyses: string[]): Promise<string> {
    return this.aiService.generateText(`Consolide as análises do processo "${processName}" em um resumo objetivo para um profissional. Não tome decisões finais e não invente dados. Destaque apenas informações presentes nas análises.\n${analyses.join('\n')}`);
  }
}