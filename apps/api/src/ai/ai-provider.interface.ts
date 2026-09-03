export interface AiProvider {
  readonly name: string;
  readonly isConfigured: boolean;
  generateText(prompt: string): Promise<string>;
}
