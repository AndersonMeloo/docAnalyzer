import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { MessageRole } from '@prisma/client';
import { PDFParse } from 'pdf-parse';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService, private readonly aiService: AiService) {}

  async list(ownerId: string, processId: string) {
    const process = await this.getOwnedProcess(ownerId, processId);
    const conversation = await this.prisma.conversation.findFirst({ where: { processId: process.id }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } });
    return conversation ?? { id: null, processId, messages: [] };
  }

  async send(ownerId: string, processId: string, dto: CreateMessageDto) {
    const process = await this.getOwnedProcess(ownerId, processId);
    if (!this.aiService.getStatus().configured) throw new ServiceUnavailableException('A conversa com a IA requer uma Gemini configurada no backend.');
    const conversation = await this.prisma.conversation.upsert({ where: { id: `${processId}-main` }, create: { id: `${processId}-main`, processId }, update: {} });
    await this.prisma.message.create({ data: { conversationId: conversation.id, role: MessageRole.USER, content: dto.content.trim() } });
    const context = await this.buildContext(processId);
    const response = await this.aiService.generateText(`Você é um assistente de análise. Responda em português, sem substituir a decisão profissional. Use somente o contexto deste processo.\nContexto:\n${context}\nPergunta:\n${dto.content}`);
    const assistant = await this.prisma.message.create({ data: { conversationId: conversation.id, role: MessageRole.ASSISTANT, content: response } });
    return assistant;
  }

  async clear(ownerId: string, processId: string): Promise<{ message: string }> {
    await this.getOwnedProcess(ownerId, processId);
    const conversations = await this.prisma.conversation.findMany({ where: { processId }, select: { id: true } });
    await this.prisma.message.deleteMany({ where: { conversationId: { in: conversations.map((conversation) => conversation.id) } } });
    return { message: 'Conversa limpa.' };
  }

  private async getOwnedProcess(ownerId: string, processId: string) {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, select: { id: true } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    return process;
  }

  private async buildContext(processId: string): Promise<string> {
    const [summary, analyses, findings, documents] = await Promise.all([
      this.prisma.processSummary.findUnique({ where: { processId }, select: { summary: true } }),
      this.prisma.analysis.findMany({ where: { document: { processId } }, select: { summary: true, document: { select: { originalName: true } } } }),
      this.prisma.finding.findMany({ where: { processId }, select: { title: true, description: true, page: true } }),
      this.prisma.document.findMany({ where: { processId, isAiProtected: false }, select: { originalName: true, storagePath: true } }),
    ]);
    const documentTexts = await Promise.all(documents.map(async (document) => {
      const parser = new PDFParse({ data: await readFile(document.storagePath) });
      try {
        const parsed = await parser.getText();
        return { originalName: document.originalName, text: parsed.text.replace(/\s+/g, ' ').trim().slice(0, 120000) };
      } finally {
        await parser.destroy();
      }
    }));
    return JSON.stringify({ summary: summary?.summary, analyses, findings, documents: documentTexts });
  }
}