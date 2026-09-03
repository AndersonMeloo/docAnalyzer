import { Controller, Delete, Get, Param, Post, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard)
@Controller('processes/:processId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }, @Param('processId') processId: string) {
    return this.documentsService.listByProcess(user.userId, processId);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 10 } }))
  upload(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @UploadedFiles() files: Express.Multer.File[]) {
    return this.documentsService.upload(user.userId, processId, files ?? []);
  }

  @Delete(':documentId')
  remove(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @Param('documentId') documentId: string) {
    return this.documentsService.remove(user.userId, processId, documentId);
  }

  @Post(':documentId/reprocess')
  reprocess(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @Param('documentId') documentId: string) {
    return this.documentsService.reprocess(user.userId, processId, documentId);
  }

  @Get(':documentId/view')
  async view(@CurrentUser() user: { userId: string }, @Param('processId') processId: string, @Param('documentId') documentId: string, @Res() response: Response) {
    const file = await this.documentsService.getOwnedFile(user.userId, processId, documentId);
    return response.sendFile(file.path, { headers: { 'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"` } });
  }
}