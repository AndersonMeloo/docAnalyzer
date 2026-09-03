import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../common/prisma/prisma.service';
import { DocumentQueueService } from './document-queue.service';

const uploadDirectory = join(process.cwd(), 'storage', 'uploads');

export interface UploadedDocument {
  id: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  pageCount: number | null;
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingError: string | null;
  isAiProtected: boolean;
  analysis: { status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'; summary: string | null; errorMessage: string | null } | null;
  createdAt: Date;
}

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly queueService: DocumentQueueService) {}

  async listByProcess(ownerId: string, processId: string): Promise<UploadedDocument[]> {
    await this.findOwnedProcess(ownerId, processId);
    return this.prisma.document.findMany({
      where: { processId },
      select: { id: true, originalName: true, sizeBytes: true, mimeType: true, pageCount: true, processingStatus: true, processingError: true, isAiProtected: true, analysis: { select: { status: true, summary: true, errorMessage: true } }, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(ownerId: string, processId: string, files: Express.Multer.File[]): Promise<UploadedDocument[]> {
    await this.findOwnedProcess(ownerId, processId);
    if (!files.length) throw new BadRequestException('Selecione ao menos um arquivo PDF.');

    await mkdir(uploadDirectory, { recursive: true });
    const documents: UploadedDocument[] = [];

    for (const file of files) {
      if (file.mimetype !== 'application/pdf' || !file.originalname.toLowerCase().endsWith('.pdf') || file.buffer.subarray(0, 5).toString() !== '%PDF-') {
        throw new BadRequestException('Apenas arquivos PDF são permitidos.');
      }
      if (file.size > 20 * 1024 * 1024) {
        throw new BadRequestException(`O arquivo ${file.originalname} excede o limite de 20 MB.`);
      }

      const storedName = `${randomUUID()}.pdf`;
      const storagePath = join(uploadDirectory, storedName);
      await writeFile(storagePath, file.buffer, { flag: 'wx' });
      const protectedDocument = /(^|[^a-z])(rg|cpf)([^a-z]|$)/i.test(file.originalname);
      const document = await this.prisma.document.create({
        data: { processId, originalName: file.originalname, storedName, storagePath, mimeType: file.mimetype, sizeBytes: file.size, isAiProtected: protectedDocument },
        select: { id: true, originalName: true, sizeBytes: true, mimeType: true, pageCount: true, processingStatus: true, processingError: true, isAiProtected: true, analysis: { select: { status: true, summary: true, errorMessage: true } }, createdAt: true },
      });
      documents.push(document);
      await this.queueService.enqueue(document.id);
    }

    return documents;
  }

  async getOwnedFile(ownerId: string, processId: string, documentId: string): Promise<{ path: string; name: string }> {
    const document = await this.prisma.document.findFirst({ where: { id: documentId, processId, process: { ownerId } }, select: { storagePath: true, originalName: true } });
    if (!document) throw new NotFoundException('Documento não encontrado.');
    return { path: document.storagePath, name: document.originalName };
  }

  async remove(ownerId: string, processId: string, documentId: string): Promise<{ message: string }> {
    const document = await this.prisma.document.findFirst({ where: { id: documentId, processId, process: { ownerId } }, select: { storagePath: true } });
    if (!document) throw new NotFoundException('Documento não encontrado.');

    await this.prisma.document.delete({ where: { id: documentId } });
    await this.prisma.processSummary.deleteMany({ where: { processId } });
    await unlink(document.storagePath).catch(() => undefined);
    return { message: 'Documento removido.' };
  }

  async reprocess(ownerId: string, processId: string, documentId: string): Promise<{ message: string }> {
    const document = await this.prisma.document.findFirst({ where: { id: documentId, processId, process: { ownerId } }, select: { id: true, isAiProtected: true } });
    if (!document) throw new NotFoundException('Documento não encontrado.');
    if (document.isAiProtected) throw new BadRequestException('Este documento está protegido e não pode ser analisado pela IA.');
    await this.prisma.analysis.deleteMany({ where: { documentId } });
    await this.queueService.enqueue(document.id);
    return { message: 'Análise reenfileirada.' };
  }

  private async findOwnedProcess(ownerId: string, processId: string) {
    const process = await this.prisma.process.findFirst({ where: { id: processId, ownerId }, select: { id: true } });
    if (!process) throw new NotFoundException('Processo não encontrado.');
    return process;
  }
}