import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ModelProvider,
  ProviderCredential as ProviderCredentialResponse,
  ProviderCredentialStatus,
  ProviderCredentialsResponse,
  UpsertProviderCredentialInput,
} from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { ProviderCredentialCryptoService } from './provider-credential-crypto.service.js';
import { ProviderKeyValidatorService } from './provider-key-validator.service.js';

type StoredCredential = {
  id: string;
  provider: 'OPENAI' | 'ANTHROPIC';
  label: string;
  last4: string;
  status: 'ACTIVE' | 'INVALID';
  createdAt: Date;
  updatedAt: Date;
  lastValidatedAt: Date | null;
};

@Injectable()
export class ProviderCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: ProviderCredentialCryptoService,
    private readonly validatorService: ProviderKeyValidatorService,
  ) {}

  async listCredentials(
    organisationId: string,
    userId: string,
  ): Promise<ProviderCredentialsResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const credentials = await this.prisma.providerCredential.findMany({
      where: { organisationId },
      orderBy: [{ provider: 'asc' }, { label: 'asc' }],
      select: this.safeCredentialSelect(),
    });

    return {
      credentials: credentials.map((credential) => this.toResponse(credential)),
    };
  }

  async upsertCredential(
    organisationId: string,
    userId: string,
    input: UpsertProviderCredentialInput,
  ): Promise<ProviderCredentialResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const provider = this.toStoredProvider(input.provider);
    const apiKey = input.apiKey.trim();
    const label = input.label.trim();
    const validation = await this.validateProviderKey(input.provider, apiKey);
    const validatedAt = new Date();
    const status = validation.usable ? 'ACTIVE' : 'INVALID';
    const encryptedSecret = this.cryptoService.encrypt(apiKey);
    const last4 = this.cryptoService.getLast4(apiKey);

    const credential = await this.prisma.providerCredential.upsert({
      where: {
        organisationId_provider_label: {
          organisationId,
          provider,
          label,
        },
      },
      create: {
        organisationId,
        provider,
        label,
        encryptedSecret,
        last4,
        status,
        createdById: userId,
        lastValidatedAt: validatedAt,
      },
      update: {
        encryptedSecret,
        last4,
        status,
        lastValidatedAt: validatedAt,
      },
      select: this.safeCredentialSelect(),
    });

    return this.toResponse(credential);
  }

  async validateCredential(
    organisationId: string,
    userId: string,
    credentialId: string,
  ): Promise<ProviderCredentialResponse> {
    await this.ensureOrganisationMember(organisationId, userId);

    const credential = await this.prisma.providerCredential.findFirst({
      where: {
        id: credentialId,
        organisationId,
      },
      select: {
        id: true,
        provider: true,
        encryptedSecret: true,
      },
    });

    if (!credential) {
      throw new NotFoundException('Provider credential was not found.');
    }

    const apiKey = this.cryptoService.decrypt(credential.encryptedSecret);
    const validation = await this.validateProviderKey(
      this.toResponseProvider(credential.provider),
      apiKey,
    );
    const updated = await this.prisma.providerCredential.update({
      where: { id: credential.id },
      data: {
        status: validation.usable ? 'ACTIVE' : 'INVALID',
        lastValidatedAt: new Date(),
      },
      select: this.safeCredentialSelect(),
    });

    return this.toResponse(updated);
  }

  async deleteCredential(organisationId: string, userId: string, credentialId: string) {
    await this.ensureOrganisationMember(organisationId, userId);

    const result = await this.prisma.providerCredential.deleteMany({
      where: {
        id: credentialId,
        organisationId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Provider credential was not found.');
    }
  }

  private async ensureOrganisationMember(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: {
        organisationId_userId: {
          organisationId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organisation.');
    }
  }

  private validateProviderKey(provider: ModelProvider, apiKey: string) {
    if (provider === 'openai') {
      return this.validatorService.validateOpenAIKey(apiKey);
    }

    throw new BadRequestException('Provider is not supported.');
  }

  private toStoredProvider(provider: ModelProvider): 'OPENAI' {
    if (provider === 'openai') {
      return 'OPENAI';
    }

    throw new BadRequestException('Provider is not supported.');
  }

  private toResponseProvider(provider: 'OPENAI' | 'ANTHROPIC'): ModelProvider {
    if (provider === 'OPENAI') {
      return 'openai';
    }

    throw new BadRequestException('Provider is not supported.');
  }

  private toResponseStatus(status: 'ACTIVE' | 'INVALID'): ProviderCredentialStatus {
    return status === 'ACTIVE' ? 'active' : 'invalid';
  }

  private toResponse(credential: StoredCredential): ProviderCredentialResponse {
    return {
      id: credential.id,
      provider: this.toResponseProvider(credential.provider),
      label: credential.label,
      maskedKeyPreview: this.cryptoService.mask(credential.last4),
      last4: credential.last4,
      status: this.toResponseStatus(credential.status),
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
      lastValidatedAt: credential.lastValidatedAt?.toISOString() ?? null,
    };
  }

  private safeCredentialSelect() {
    return {
      id: true,
      provider: true,
      label: true,
      last4: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastValidatedAt: true,
    } as const;
  }
}
