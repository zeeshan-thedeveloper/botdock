import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { apiEnvironmentSchema } from '@botdock/config';
import { AiModule } from './ai/ai.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BotsModule } from './bots/bots.module.js';
import { ChatModule } from './chat/chat.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DeploymentModule } from './deployment/deployment.module.js';
import { HealthModule } from './health/health.module.js';
import { KnowledgeModule } from './knowledge/knowledge.module.js';
import { LoggerModule } from './logger/logger.module.js';
import { ProviderCredentialsModule } from './provider-credentials/provider-credentials.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => apiEnvironmentSchema.parse(config),
    }),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    BotsModule,
    ProviderCredentialsModule,
    AiModule,
    KnowledgeModule,
    ChatModule,
    DeploymentModule,
    ConversationsModule,
    HealthModule,
  ],
})
export class AppModule {}
