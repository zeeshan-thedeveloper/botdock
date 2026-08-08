import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  KnowledgeSource as KnowledgeSourceResponse,
  KnowledgeSourcesResponse,
  KnowledgeSourceType,
  ModelProvider,
} from '@botdock/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { CreateKnowledgeSourceDto } from './knowledge.dto.js';
import { IngestionQueueService } from './ingestion-queue.service.js';
import { ObjectStorageService } from './object-storage.service.js';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_FILE_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/pdf',
]);
const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small';
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type StoredKnowledgeSource = {
  id: string;
  organisationId: string;
  botId: string;
  type: 'FILE' | 'TEXT' | 'FAQ';
  name: string;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  embeddingProvider: 'OPENAI' | 'ANTHROPIC';
  embeddingModel: string;
  chunkCount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class KnowledgeService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ObjectStorageService) private readonly objectStorage: ObjectStorageService,
    @Inject(IngestionQueueService) private readonly ingestionQueue: IngestionQueueService,
  ) {}

  async listSources(
    organisationId: string,
    botId: string,
    userId: string,
  ): Promise<KnowledgeSourcesResponse> {
    await this.ensureOrganisationMember(organisationId, userId);
    await this.ensureBotInOrganisation(organisationId, botId);

    const sources = await this.prisma.knowledgeSource.findMany({
      where: { organisationId, botId },
      orderBy: { createdAt: 'desc' },
    });

    return { sources: sources.map((source) => this.toResponse(source)) };
  }

  async createSource(
    organisationId: string,
    botId: string,
    userId: string,
    input: CreateKnowledgeSourceDto,
    file: UploadedFile | undefined,
  ): Promise<KnowledgeSourceResponse> {
    await this.ensureOrganisationMember(organisationId, userId);
    const bot = await this.ensureBotInOrganisation(organisationId, botId);
    const activeCredential = this.ensureActiveCredential(bot);

    const { fileName, mimeType, buffer } = this.resolveContent(input, file);
    const checksum = createHash('sha256').update(buffer).digest('hex');

    const source = await this.prisma.knowledgeSource.create({
      data: {
        organisationId,
        botId,
        type: this.toStoredType(input.type),
        name: input.name.trim(),
        status: 'PROCESSING',
        embeddingProvider: activeCredential.provider,
        embeddingModel: DEFAULT_EMBEDDING_MODEL,
        embeddingDimensions: DEFAULT_EMBEDDING_DIMENSIONS,
      },
    });

    try {
      const objectStorageKey = this.buildObjectKey(organisationId, botId, source.id, fileName);
      await this.objectStorage.putObject(objectStorageKey, buffer, mimeType);
      await this.prisma.document.create({
        data: {
          organisationId,
          botId,
          knowledgeSourceId: source.id,
          fileName,
          mimeType,
          objectStorageKey,
          checksum,
          sizeBytes: buffer.length,
          parseStatus: 'PENDING',
        },
      });
    } catch (error) {
      await this.prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: 'FAILED', errorMessage: 'Failed to store the uploaded content.' },
      });
      throw error;
    }

    await this.ingestionQueue.enqueue({
      organisationId,
      botId,
      knowledgeSourceId: source.id,
    });

    return this.toResponse(source);
  }

  async deleteSource(
    organisationId: string,
    botId: string,
    sourceId: string,
    userId: string,
  ): Promise<void> {
    await this.ensureOrganisationMember(organisationId, userId);

    const source = await this.prisma.knowledgeSource.findFirst({
      where: { id: sourceId, organisationId, botId },
      include: { documents: { select: { objectStorageKey: true } } },
    });

    if (!source) {
      throw new NotFoundException('Knowledge source was not found.');
    }

    const objectKeys = source.documents
      .map((document) => document.objectStorageKey)
      .filter((key): key is string => Boolean(key));

    await this.objectStorage.deleteObjects(objectKeys);
    await this.prisma.knowledgeSource.delete({ where: { id: source.id } });
  }

  private resolveContent(
    input: CreateKnowledgeSourceDto,
    file: UploadedFile | undefined,
  ): { fileName: string; mimeType: string; buffer: Buffer } {
    if (input.type === 'file') {
      if (!file) {
        throw new BadRequestException('A file is required for file knowledge sources.');
      }

      if (!ALLOWED_FILE_MIME_TYPES.has(file.mimetype)) {
        throw new BadRequestException(`File type "${file.mimetype}" is not supported.`);
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException('File exceeds the 20MB upload limit.');
      }

      return { fileName: file.originalname, mimeType: file.mimetype, buffer: file.buffer };
    }

    if (!input.content || input.content.trim().length === 0) {
      throw new BadRequestException('Content is required for text and FAQ knowledge sources.');
    }

    return {
      fileName: 'content.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(input.content, 'utf8'),
    };
  }

  private buildObjectKey(
    organisationId: string,
    botId: string,
    knowledgeSourceId: string,
    fileName: string,
  ): string {
    const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return `${organisationId}/${botId}/${knowledgeSourceId}/${safeName}`;
  }

  private async ensureOrganisationMember(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organisation.');
    }
  }

  private async ensureBotInOrganisation(organisationId: string, botId: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id: botId, organisationId },
      select: {
        id: true,
        providerCredential: { select: { provider: true, status: true } },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot was not found.');
    }

    return bot;
  }

  private ensureActiveCredential(bot: {
    providerCredential: { provider: 'OPENAI' | 'ANTHROPIC'; status: 'ACTIVE' | 'INVALID' } | null;
  }): { provider: 'OPENAI' | 'ANTHROPIC' } {
    if (!bot.providerCredential || bot.providerCredential.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Connect a provider key first: this bot has no active provider credential.',
      );
    }

    return bot.providerCredential;
  }

  private toStoredType(type: KnowledgeSourceType): 'FILE' | 'TEXT' | 'FAQ' {
    return type.toUpperCase() as 'FILE' | 'TEXT' | 'FAQ';
  }

  private toResponseType(type: 'FILE' | 'TEXT' | 'FAQ'): KnowledgeSourceType {
    return type.toLowerCase() as KnowledgeSourceType;
  }

  private toResponseStatus(status: 'PROCESSING' | 'READY' | 'FAILED') {
    return status.toLowerCase() as 'processing' | 'ready' | 'failed';
  }

  private toResponseProvider(provider: 'OPENAI' | 'ANTHROPIC'): ModelProvider {
    if (provider === 'OPENAI') {
      return 'openai';
    }

    throw new BadRequestException('Provider is not supported.');
  }

  private toResponse(source: StoredKnowledgeSource): KnowledgeSourceResponse {
    return {
      id: source.id,
      organisationId: source.organisationId,
      botId: source.botId,
      type: this.toResponseType(source.type),
      name: source.name,
      status: this.toResponseStatus(source.status),
      embeddingProvider: this.toResponseProvider(source.embeddingProvider),
      embeddingModel: source.embeddingModel,
      chunkCount: source.chunkCount,
      errorMessage: source.errorMessage,
      createdAt: source.createdAt.toISOString(),
      updatedAt: source.updatedAt.toISOString(),
    };
  }
}
