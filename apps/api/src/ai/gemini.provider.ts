import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenerativeAI | null;
  private readonly modelName: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.modelName = config.get<string>('GEMINI_MODEL', 'gemini-3.6-flash');
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('A integração com Gemini não está configurada no backend.');
    }
    if (!prompt.trim()) throw new ServiceUnavailableException('O prompt da IA não pode estar vazio.');

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          return result.response.text();
        } catch (error) {
          const message = error instanceof Error ? error.message : '';
          const isQuotaExceeded = /quota exceeded|free_tier_requests|daily|exceeded your current quota/i.test(message);
          const isTransient = !isQuotaExceeded && /503|429|high demand|unavailable|temporar/i.test(message);
          if (!isTransient || attempt === 2) throw error;
          await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
      throw new Error('O Gemini não respondeu após as tentativas automáticas.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida no provedor Gemini.';
      if (/quota exceeded|free_tier_requests|daily|exceeded your current quota/i.test(message)) {
        throw new ServiceUnavailableException('A cota diária gratuita do Gemini foi atingida. Tente novamente amanhã ou configure um plano de cobrança no Google AI Studio.');
      }
      throw new ServiceUnavailableException(`Gemini não respondeu: ${message}`);
    }
  }
}