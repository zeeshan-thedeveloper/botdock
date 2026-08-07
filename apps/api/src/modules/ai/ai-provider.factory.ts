import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OpenAIChatModelProvider,
  OpenAIEmbeddingProvider,
  type ChatModelProvider,
  type EmbeddingProvider,
} from '@botdock/ai-core';
import { PrismaService } from '../database/prisma.service.js';
import { ProviderCredentialCryptoService } from '../provider-credentials/provider-credential-crypto.service.js';
import { ProviderNotConfiguredError } from './ai.errors.js';

const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';

export interface ResolveProviderInput {
  organisationId: string;
  providerCredentialId: string;
}

@Injectable()
export class AiProviderFactory {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ProviderCredentialCryptoService)
    private readonly cryptoService: ProviderCredentialCryptoService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async getChatProvider(input: ResolveProviderInput): Promise<ChatModelProvider> {
    const apiKey = await this.resolveActiveApiKey(input);
    return new OpenAIChatModelProvider({ apiKey, baseUrl: this.baseUrl() });
  }

  async getEmbeddingProvider(
    input: ResolveProviderInput & { model?: string },
  ): Promise<EmbeddingProvider> {
    const apiKey = await this.resolveActiveApiKey(input);
    return new OpenAIEmbeddingProvider({
      apiKey,
      baseUrl: this.baseUrl(),
      model: input.model ?? DEFAULT_EMBEDDING_MODEL,
    });
  }

  private async resolveActiveApiKey(input: ResolveProviderInput): Promise<string> {
    const credential = await this.prisma.providerCredential.findFirst({
      where: {
        id: input.providerCredentialId,
        organisationId: input.organisationId,
        status: 'ACTIVE',
      },
      select: { encryptedSecret: true },
    });

    if (!credential) {
      throw new ProviderNotConfiguredError();
    }

    return this.cryptoService.decrypt(credential.encryptedSecret);
  }

  private baseUrl(): string | undefined {
    return this.configService.get<string>('OPENAI_BASE_URL');
  }
}
