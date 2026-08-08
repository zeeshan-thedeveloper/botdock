import { OpenAIChatModelProvider, OpenAIEmbeddingProvider } from '@botdock/ai-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiProviderFactory } from './ai-provider.factory.js';
import { ProviderNotConfiguredError } from './ai.errors.js';

function createPrismaMock() {
  return {
    providerCredential: {
      findFirst: vi.fn(),
    },
  };
}

describe('AiProviderFactory', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let cryptoService: { decrypt: ReturnType<typeof vi.fn> };
  let configService: { get: ReturnType<typeof vi.fn> };
  let factory: AiProviderFactory;

  beforeEach(() => {
    prisma = createPrismaMock();
    cryptoService = { decrypt: vi.fn() };
    configService = { get: vi.fn().mockReturnValue(undefined) };
    factory = new AiProviderFactory(prisma as never, cryptoService as never, configService as never);
  });

  it('resolves a chat provider from the active credential, scoped to the organisation', async () => {
    prisma.providerCredential.findFirst.mockResolvedValue({ encryptedSecret: 'v1:enc' });
    cryptoService.decrypt.mockReturnValue('sk-live-secret');

    const provider = await factory.getChatProvider({
      organisationId: 'org-1',
      providerCredentialId: 'cred-1',
    });

    expect(prisma.providerCredential.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cred-1', organisationId: 'org-1', status: 'ACTIVE' },
      }),
    );
    expect(cryptoService.decrypt).toHaveBeenCalledWith('v1:enc');
    expect(provider).toBeInstanceOf(OpenAIChatModelProvider);
  });

  it('resolves an embedding provider defaulting to text-embedding-3-small', async () => {
    prisma.providerCredential.findFirst.mockResolvedValue({ encryptedSecret: 'v1:enc' });
    cryptoService.decrypt.mockReturnValue('sk-live-secret');

    const provider = await factory.getEmbeddingProvider({
      organisationId: 'org-1',
      providerCredentialId: 'cred-1',
    });

    expect(provider).toBeInstanceOf(OpenAIEmbeddingProvider);
  });

  it('throws ProviderNotConfiguredError when there is no active credential', async () => {
    prisma.providerCredential.findFirst.mockResolvedValue(null);

    await expect(
      factory.getChatProvider({ organisationId: 'org-1', providerCredentialId: 'missing' }),
    ).rejects.toBeInstanceOf(ProviderNotConfiguredError);
    expect(cryptoService.decrypt).not.toHaveBeenCalled();
  });
});
