import { randomUUID } from 'node:crypto';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Worker, type Job } from 'bullmq';
import { PDFParse } from 'pdf-parse';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { PrismaService } from '../database/prisma.service.js';
import { KNOWLEDGE_INGESTION_QUEUE, type KnowledgeIngestionJobData } from './ingestion-queue.service.js';
import { ObjectStorageService } from './object-storage.service.js';
import { chunkText } from './text-chunker.js';

const WORKER_CONCURRENCY = 2;

type SourceWithDocuments = {
  id: string;
  organisationId: string;
  botId: string;
  name: string;
  embeddingModel: string;
  bot: { providerCredentialId: string | null };
  documents: {
    id: string;
    fileName: string | null;
    mimeType: string | null;
    objectStorageKey: string | null;
  }[];
};

type ExtractedChunk = {
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class IngestionWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly connection: Redis;
  private worker?: Worker<KnowledgeIngestionJobData>;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ObjectStorageService) private readonly objectStorage: ObjectStorageService,
    @Inject(AiProviderFactory) private readonly aiProviderFactory: AiProviderFactory,
  ) {
    this.connection = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<KnowledgeIngestionJobData>(
      KNOWLEDGE_INGESTION_QUEUE,
      (job: Job<KnowledgeIngestionJobData>) => this.processJob(job.data),
      { connection: this.connection, concurrency: WORKER_CONCURRENCY },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    this.connection.disconnect();
  }

  async processJob(data: KnowledgeIngestionJobData): Promise<void> {
    const source = await this.prisma.knowledgeSource.findFirst({
      where: { id: data.knowledgeSourceId, organisationId: data.organisationId, botId: data.botId },
      include: {
        documents: {
          select: { id: true, fileName: true, mimeType: true, objectStorageKey: true },
        },
        bot: { select: { providerCredentialId: true } },
      },
    });

    if (!source) {
      // Source was deleted before the job ran; nothing left to ingest.
      return;
    }

    try {
      if (!source.bot.providerCredentialId) {
        throw new Error('Bot has no connected provider credential.');
      }

      const chunks = await this.extractChunks(source);

      // Idempotent re-run: replace this source's chunk set entirely rather than append.
      await this.prisma.documentChunk.deleteMany({ where: { knowledgeSourceId: source.id } });

      if (chunks.length === 0) {
        await this.prisma.knowledgeSource.update({
          where: { id: source.id },
          data: { status: 'READY', chunkCount: 0, errorMessage: null },
        });
        return;
      }

      const embeddingProvider = await this.aiProviderFactory.getEmbeddingProvider({
        organisationId: source.organisationId,
        providerCredentialId: source.bot.providerCredentialId,
        model: source.embeddingModel,
      });

      const vectors = await embeddingProvider.generateEmbeddings(chunks.map((chunk) => chunk.content));

      for (let index = 0; index < chunks.length; index += 1) {
        await this.insertChunk(source, chunks[index]!, vectors[index]!);
      }

      await this.prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: 'READY', chunkCount: chunks.length, errorMessage: null },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingestion failed.';
      await this.prisma.knowledgeSource.update({
        where: { id: source.id },
        data: { status: 'FAILED', errorMessage: message.slice(0, 500) },
      });
      throw error;
    }
  }

  private async extractChunks(source: SourceWithDocuments): Promise<ExtractedChunk[]> {
    const chunks: ExtractedChunk[] = [];

    for (const document of source.documents) {
      const text = await this.extractText(document);
      const pieces = chunkText(text);

      pieces.forEach((content, chunkIndex) => {
        chunks.push({
          documentId: document.id,
          content,
          metadata: {
            sourceName: source.name,
            documentFileName: document.fileName,
            chunkIndex,
          },
        });
      });
    }

    return chunks;
  }

  private async extractText(document: SourceWithDocuments['documents'][number]): Promise<string> {
    if (!document.objectStorageKey) {
      throw new Error('Document has no stored content.');
    }

    const buffer = await this.objectStorage.getObject(document.objectStorageKey);

    if (document.mimeType === 'application/pdf') {
      return this.extractPdfText(buffer);
    }

    return buffer.toString('utf8');
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } catch (error) {
      // A scanned/image-only PDF isn't an error here — getText() just
      // returns near-empty text for it, which chunkText() turns into zero
      // chunks (extractChunks's caller already treats that as a valid
      // READY-with-nothing-to-embed outcome). An actual throw means pdf.js
      // couldn't parse the file at all (corrupt, encrypted, unsupported).
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not parse this PDF: ${reason}`);
    } finally {
      await parser.destroy();
    }
  }

  private async insertChunk(
    source: Pick<SourceWithDocuments, 'id' | 'organisationId' | 'botId' | 'embeddingModel'>,
    chunk: ExtractedChunk,
    vector: number[],
  ): Promise<void> {
    const id = randomUUID();
    const vectorLiteral = `[${vector.join(',')}]`;
    const metadataJson = JSON.stringify(chunk.metadata);

    await this.prisma.$executeRaw`
      INSERT INTO "document_chunks"
        ("id", "organisationId", "botId", "knowledgeSourceId", "documentId", "content", "metadata", "embedding", "embeddingModel", "createdAt")
      VALUES
        (${id}, ${source.organisationId}, ${source.botId}, ${source.id}, ${chunk.documentId}, ${chunk.content}, ${metadataJson}::jsonb, ${vectorLiteral}::vector, ${source.embeddingModel}, now())
    `;
  }
}
