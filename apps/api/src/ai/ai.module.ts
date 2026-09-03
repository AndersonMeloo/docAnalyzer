import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard';
import { AI_PROVIDER } from './ai.service';
import { GeminiProvider } from './gemini.provider';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
	imports: [AuthModule],
	controllers: [AiController],
	providers: [
		GeminiProvider,
		{
			provide: AI_PROVIDER,
			inject: [ConfigService, GeminiProvider],
			useFactory: (config: ConfigService, geminiProvider: GeminiProvider) => {
				const provider = config.get<string>('AI_PROVIDER', 'gemini');
				if (provider !== 'gemini') throw new Error(`Provedor de IA não suportado: ${provider}`);
				return geminiProvider;
			},
		},
		AiService,
		JwtAuthGuard,
	],
	exports: [AiService],
})
export class AiModule {}
