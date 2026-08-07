import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { IngestionQueueService } from './ingestion-queue.service.js';
import { IngestionWorkerService } from './ingestion-worker.service.js';
import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeService } from './knowledge.service.js';
import { ObjectStorageService } from './object-storage.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, AiModule],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    ObjectStorageService,
    IngestionQueueService,
    IngestionWorkerService,
    SessionAuthGuard,
  ],
})
export class KnowledgeModule {}
