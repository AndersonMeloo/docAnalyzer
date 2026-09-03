import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import { DocumentProcessingService } from './document-processing.service';

interface DocumentJob { documentId: string; }

@Injectable()
export class DocumentQueueService implements OnModuleDestroy {
  private readonly enabled: boolean;
  private readonly processingService: DocumentProcessingService;
  private readonly queue: Queue<DocumentJob> | null;
  private readonly worker: Worker<DocumentJob> | null;

  constructor(config: ConfigService, processingService: DocumentProcessingService) {
    this.processingService = processingService;
    this.enabled = config.get<string>('REDIS_ENABLED', 'false').toLowerCase() === 'true';
    if (!this.enabled) {
      this.queue = null;
      this.worker = null;
      return;
    }

    const connection = this.redisConnection(config.get<string>('REDIS_URL', 'redis://localhost:6379'));
    this.queue = new Queue<DocumentJob>('document-processing', { connection });
    this.worker = new Worker<DocumentJob>('document-processing', (job: Job<DocumentJob>) => processingService.process(job.data.documentId), { connection, concurrency: 2 });
    this.worker.on('error', (error) => console.error('Erro no worker de documentos:', error.message));
  }

  async enqueue(documentId: string): Promise<void> {
    if (!this.queue) {
      setImmediate(() => void this.processFallback(documentId));
      return;
    }
    await this.queue.add('process-document', { documentId }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 100, removeOnFail: 100 });
  }

  private async processFallback(documentId: string): Promise<void> {
    await this.processingService.process(documentId);
  }

  private redisConnection(redisUrl: string) {
    const url = new URL(redisUrl);
    return { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined, maxRetriesPerRequest: null };
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.queue?.close(), this.worker?.close()]);
  }
}