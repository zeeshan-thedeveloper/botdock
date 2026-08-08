import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { ProviderCredentialsModule } from '../provider-credentials/provider-credentials.module.js';
import { AiProviderFactory } from './ai-provider.factory.js';

@Module({
  imports: [DatabaseModule, ProviderCredentialsModule],
  providers: [AiProviderFactory],
  exports: [AiProviderFactory],
})
export class AiModule {}
