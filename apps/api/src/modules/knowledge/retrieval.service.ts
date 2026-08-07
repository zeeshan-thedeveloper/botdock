import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiProviderFactory } from '../ai/ai-provider.factory.js';
import { PrismaService } from '../database/prisma.service.js';

const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 12;
/** Cosine-similarity floor; below this a chunk is treated as "not relevant". */
const MIN_RELEVANCE_SCORE = 0.15;
/** Conservative char budget so retrieved context fits comfortably in the chat prompt. */
const MAX_CONTEXT_CHARS = 12_000;

export interface RetrievedChunk {
  chunkId: string;
  documentId: string | null;
  knowledgeSourceId: string;
  content: string;
  /** Cosine similarity in [-1, 1]; 1 is identical. */
  score: number;
  metadata: Record<string, unknown>;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  hasRelevantKnowledge: boolean;
}

export interface RetrieveInput {
  organisationId: string;
  botId: string;
  query: string;
  topK?: number;
}

type RawChunkRow = {
  id: string;
  documentId: string | null;
  knowledgeSourceId: string;
  content: string;
  metadata: unknown;
  score: number;
};

@Injectable()
export class RetrievalService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AiProviderFactory) private readonly aiProviderFactory: AiProviderFactory,
  ) {}

  async retrieve(input: RetrieveInput): Promise<RetrievalResult> {
    const topK = Math.max(1, Math.min(input.topK ?? DEFAULT_TOP_K, MAX_TOP_K));
    const query = input.query.trim();

    if (!query) {
      return { chunks: [], hasRelevantKnowledge: false };
    }

    const bot = await this.prisma.bot.findFirst({
      where: { id: input.botId, organisationId: input.organisationId },
      select: { providerCredentialId: true },
    });

    if (!bot) {
      throw new NotFoundException('Bot was not found.');
    }

    if (!bot.providerCredentialId) {
      // No connected key means no query embedding can be produced; nothing to search.
      return { chunks: [], hasRelevantKnowledge: false };
    }

    const readySources = await this.prisma.knowledgeSource.findMany({
      where: { organisationId: input.organisationId, botId: input.botId, status: 'READY' },
      distinct: ['embeddingModel'],
      select: { embeddingModel: true },
    });

    if (readySources.length === 0) {
      return { chunks: [], hasRelevantKnowledge: false };
    }

    const candidates: RetrievedChunk[] = [];

    for (const { embeddingModel } of readySources) {
      const rows = await this.searchByModel({
        organisationId: input.organisationId,
        botId: input.botId,
        providerCredentialId: bot.providerCredentialId,
        embeddingModel,
        query,
        topK,
      });
      candidates.push(...rows);
    }

    const relevant = candidates
      .filter((chunk) => chunk.score >= MIN_RELEVANCE_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    const chunks = this.capByContextBudget(relevant);

    return { chunks, hasRelevantKnowledge: chunks.length > 0 };
  }

  private async searchByModel(input: {
    organisationId: string;
    botId: string;
    providerCredentialId: string;
    embeddingModel: string;
    query: string;
    topK: number;
  }): Promise<RetrievedChunk[]> {
    const embeddingProvider = await this.aiProviderFactory.getEmbeddingProvider({
      organisationId: input.organisationId,
      providerCredentialId: input.providerCredentialId,
      model: input.embeddingModel,
    });

    const [queryVector] = await embeddingProvider.generateEmbeddings([input.query]);
    const vectorLiteral = `[${queryVector!.join(',')}]`;

    const rows = await this.prisma.$queryRaw<RawChunkRow[]>`
      SELECT id, "documentId", "knowledgeSourceId", content, metadata,
             1 - (embedding <=> ${vectorLiteral}::vector) AS score
      FROM "document_chunks"
      WHERE "organisationId" = ${input.organisationId}
        AND "botId" = ${input.botId}
        AND "embeddingModel" = ${input.embeddingModel}
      ORDER BY embedding <=> ${vectorLiteral}::vector ASC
      LIMIT ${input.topK}
    `;

    return rows.map((row) => this.toRetrievedChunk(row));
  }

  private capByContextBudget(chunks: RetrievedChunk[]): RetrievedChunk[] {
    const result: RetrievedChunk[] = [];
    let used = 0;

    for (const chunk of chunks) {
      if (used + chunk.content.length > MAX_CONTEXT_CHARS && result.length > 0) {
        break;
      }
      result.push(chunk);
      used += chunk.content.length;
    }

    return result;
  }

  private toRetrievedChunk(row: RawChunkRow): RetrievedChunk {
    return {
      chunkId: row.id,
      documentId: row.documentId,
      knowledgeSourceId: row.knowledgeSourceId,
      content: row.content,
      score: Number(row.score),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    };
  }
}
