import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProviderCredentialCryptoService } from './provider-credential-crypto.service.js';
import { ProviderKeyValidatorService } from './provider-key-validator.service.js';
import { ProviderCredentialsController } from './provider-credentials.controller.js';
import { ProviderCredentialsService } from './provider-credentials.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProviderCredentialsController],
  providers: [
    ProviderCredentialCryptoService,
    ProviderKeyValidatorService,
    ProviderCredentialsService,
  ],
})
export class ProviderCredentialsModule {}
