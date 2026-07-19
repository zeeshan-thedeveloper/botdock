import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProviderCredentialsService } from './provider-credentials.service.js';

const now = new Date('2026-07-19T10:00:00.000Z');

function createPrismaMock() {
  return {
    organisationMember: {
      findUnique: vi.fn(),
    },
    providerCredential: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

describe('ProviderCredentialsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let cryptoService: {
    decrypt: ReturnType<typeof vi.fn>;
    encrypt: ReturnType<typeof vi.fn>;
    getLast4: ReturnType<typeof vi.fn>;
    mask: ReturnType<typeof vi.fn>;
  };
  let validatorService: {
    validateOpenAIKey: ReturnType<typeof vi.fn>;
  };
  let service: ProviderCredentialsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    cryptoService = {
      decrypt: vi.fn(),
      encrypt: vi.fn(),
      getLast4: vi.fn(),
      mask: vi.fn(),
    };
    validatorService = {
      validateOpenAIKey: vi.fn(),
    };
    service = new ProviderCredentialsService(
      prisma as never,
      cryptoService as never,
      validatorService as never,
    );
  });

  it('upserts encrypted OpenAI credentials and returns safe metadata only', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    validatorService.validateOpenAIKey.mockResolvedValue({ usable: true });
    cryptoService.encrypt.mockReturnValue('v1:encrypted-secret');
    cryptoService.getLast4.mockReturnValue('1234');
    cryptoService.mask.mockReturnValue('****1234');
    prisma.providerCredential.upsert.mockResolvedValue({
      id: 'credential-1',
      provider: 'OPENAI',
      label: 'Production',
      last4: '1234',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      lastValidatedAt: now,
    });

    const result = await service.upsertCredential('org-1', 'user-1', {
      provider: 'openai',
      label: ' Production ',
      apiKey: ' sk-live-secret-1234 ',
    });

    expect(validatorService.validateOpenAIKey).toHaveBeenCalledWith('sk-live-secret-1234');
    expect(cryptoService.encrypt).toHaveBeenCalledWith('sk-live-secret-1234');
    expect(prisma.providerCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          encryptedSecret: 'v1:encrypted-secret',
          last4: '1234',
          provider: 'OPENAI',
          status: 'ACTIVE',
        }),
      }),
    );
    expect(result).toEqual({
      id: 'credential-1',
      provider: 'openai',
      label: 'Production',
      maskedKeyPreview: '****1234',
      last4: '1234',
      status: 'active',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastValidatedAt: now.toISOString(),
    });
    expect(result).not.toHaveProperty('apiKey');
    expect(result).not.toHaveProperty('encryptedSecret');
  });

  it('records invalid status when OpenAI validation fails', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    validatorService.validateOpenAIKey.mockResolvedValue({ usable: false });
    cryptoService.encrypt.mockReturnValue('v1:encrypted-secret');
    cryptoService.getLast4.mockReturnValue('0000');
    cryptoService.mask.mockReturnValue('****0000');
    prisma.providerCredential.upsert.mockResolvedValue({
      id: 'credential-1',
      provider: 'OPENAI',
      label: 'Broken',
      last4: '0000',
      status: 'INVALID',
      createdAt: now,
      updatedAt: now,
      lastValidatedAt: now,
    });

    const result = await service.upsertCredential('org-1', 'user-1', {
      provider: 'openai',
      label: 'Broken',
      apiKey: 'sk-bad-0000',
    });

    expect(result.status).toBe('invalid');
    expect(prisma.providerCredential.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'INVALID' }),
        update: expect.objectContaining({ status: 'INVALID' }),
      }),
    );
  });

  it('blocks list access when the user is not an organisation member', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue(null);

    await expect(service.listCredentials('org-1', 'user-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.providerCredential.findMany).not.toHaveBeenCalled();
  });

  it('validates only credentials scoped to the requested organisation', async () => {
    prisma.organisationMember.findUnique.mockResolvedValue({ id: 'member-1' });
    prisma.providerCredential.findFirst.mockResolvedValue(null);

    await expect(
      service.validateCredential('org-1', 'user-1', 'credential-from-other-org'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(cryptoService.decrypt).not.toHaveBeenCalled();
  });
});
