import { Inject, Injectable } from '@nestjs/common';
import { AiProvider } from './ai-provider.interface';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

@Injectable()
export class AiService {
  constructor(@Inject(AI_PROVIDER) private readonly provider: AiProvider) {}

  getStatus(): { provider: string; configured: boolean } {
    return { provider: this.provider.name, configured: this.provider.isConfigured };
  }

  generateText(prompt: string): Promise<string> {
    return this.provider.generateText(prompt);
  }
}