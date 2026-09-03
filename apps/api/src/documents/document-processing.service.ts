import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { DocumentProcessingStatus } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';

@Injectable()
export class DocumentProcessingService {
  constructor(private readonly prisma: PrismaService, private readonly analysisService: AnalysisService) {}

  schedule(documentId: string): void {
    setImmediate(() => void this.process(documentId));
  }

  async process(documentId: string): Promise<void> {
    await this.prisma.document.update({ where: { id: documentId }, data: { processingStatus: DocumentProcessingStatus.PROCESSING } });

    try {
      const document = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
      const content = await readFile(document.storagePath);
      const pageCount = this.countPages(content);
      const contentHash = createHash('sha256').update(content).digest('hex');
      const text = await this.extractText(content);

      await this.prisma.document.update({
        where: { id: documentId },
        data: { pageCount, contentHash, processingStatus: DocumentProcessingStatus.COMPLETED, processedAt: new Date(), processingError: null },
      });
      await this.analysisService.analyzeDocument(documentId, text);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida no processamento.';
      await this.prisma.document.update({ where: { id: documentId }, data: { processingStatus: DocumentProcessingStatus.FAILED, processingError: message } });
    }
  }

  private countPages(content: Buffer): number {
    const pageMatches = content.toString('latin1').match(/\/Type\s*\/Page(?!s\b)/g);
    return Math.max(pageMatches?.length ?? 0, 1);
  }

  private async extractText(content: Buffer): Promise<string> {
    const parser = new PDFParse({ data: content });
    try {
      const parsed = await parser.getText();
      return parsed.text.replace(/\s+/g, ' ').trim();
    } finally {
      await parser.destroy();
    }
  }
}