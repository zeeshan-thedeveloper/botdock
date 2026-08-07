import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { KnowledgeModule } from '../knowledge/knowledge.module.js';
import { ChatService } from './chat.service.js';
import { PlaygroundController } from './playground.controller.js';

@Module({
  imports: [AuthModule, DatabaseModule, AiModule, KnowledgeModule],
  controllers: [PlaygroundController],
  providers: [ChatService, SessionAuthGuard],
  exports: [ChatService],
})
export class ChatModule {}
