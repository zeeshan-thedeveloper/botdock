import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { IngestionQueueService } from './ingestion-queue.service.js';
import { KnowledgeController } from './knowledge.controller.js';
import { KnowledgeService } from './knowledge.service.js';
import { ObjectStorageService } from './object-storage.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ObjectStorageService, IngestionQueueService, SessionAuthGuard],
})
export class KnowledgeModule {}
