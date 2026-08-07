import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { ChatService } from './chat.service.js';

@Module({
  imports: [DatabaseModule, AiModule, KnowledgeModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
