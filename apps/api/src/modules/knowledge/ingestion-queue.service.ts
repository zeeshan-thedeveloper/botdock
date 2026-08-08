import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

export const KNOWLEDGE_INGESTION_QUEUE = 'knowledge-ingestion';

export interface KnowledgeIngestionJobData {
  organisationId: string;
  botId: string;
  knowledgeSourceId: string;
}

@Injectable()
export class IngestionQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<KnowledgeIngestionJobData>;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.connection = new Redis(configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue(KNOWLEDGE_INGESTION_QUEUE, { connection: this.connection });
  }

  async enqueue(data: KnowledgeIngestionJobData): Promise<void> {
    await this.queue.add('ingest', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}
