import { Injectable } from '@nestjs/common';
import { AnalysisStatus, FindingSeverity } from '@prisma/client';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../common/prisma/prisma.service';

interface AnalysisResult {
  summary: string;
  extractedInformation: Record<string, string>;
  attentionPoints: Array<{ page?: number; severity?: FindingSeverity; title: string; description: string }>;
}

@Injectable()
export class AnalysisService {
  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService) {}

  async analyzeDocument(documentId: string, text: string): Promise<void> {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.isAiProtected) return;

    const analysis = await this.prisma.analysis.upsert({ where: { documentId }, create: { documentId, status: AnalysisStatus.PENDING }, update: { status: AnalysisStatus.PENDING, errorMessage: null } });
    if (!this.aiService.getStatus().configured) return;

    await this.prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.PROCESSING } });
    try {
      const result = await this.aiService.generateText(this.buildPrompt(document.originalName, text));
      const parsed = this.parseResult(result);
      await this.prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.COMPLETED, summary: parsed.summary, extractedInformation: parsed.extractedInformation, attentionPoints: parsed.attentionPoints } });
      await this.prisma.finding.deleteMany({ where: { documentId } });
      if (parsed.attentionPoints.length) await this.prisma.finding.createMany({ data: parsed.attentionPoints.map((finding) => ({ processId: document.processId, documentId, page: finding.page ?? null, severity: finding.severity ?? FindingSeverity.WARNING, title: finding.title, description: finding.description })) });
    } catch (error) {
      await this.prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.FAILED, errorMessage: error instanceof Error ? error.message : 'Falha na análise.' } });
    }
  }

  private buildPrompt(fileName: string, text: string): string {
    return `Você é um assistente de análise documental. Nunca tome a decisão final pelo profissional. Analise o documento "${fileName}" e responda somente em JSON válido com as chaves summary (string), extractedInformation (objeto com informações relevantes) e attentionPoints (lista de pontos de atenção). Indique incertezas claramente. Texto do documento:\n${text.slice(0, 120000)}`;
  }

  private parseResult(result: string): AnalysisResult {
    const normalized = result.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const parsed = JSON.parse(normalized) as Partial<AnalysisResult>;
      return { summary: parsed.summary ?? 'A IA não retornou um resumo.', extractedInformation: parsed.extractedInformation ?? {}, attentionPoints: parsed.attentionPoints ?? [] };
    } catch {
      return { summary: result, extractedInformation: {}, attentionPoints: [] };
    }
  }
}