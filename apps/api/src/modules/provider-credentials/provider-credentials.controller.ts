import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ProviderCredential, ProviderCredentialsResponse } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { ProviderCredentialsService } from './provider-credentials.service.js';
import { UpsertProviderCredentialDto } from './provider-credentials.dto.js';

@ApiTags('provider-credentials')
@UseGuards(SessionAuthGuard)
@Controller('organisations/:orgId/provider-credentials')
export class ProviderCredentialsController {
  constructor(
    @Inject(ProviderCredentialsService)
    private readonly providerCredentialsService: ProviderCredentialsService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Provider credentials safe metadata.' })
  listCredentials(
    @Param('orgId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProviderCredentialsResponse> {
    return this.providerCredentialsService.listCredentials(organisationId, user.id);
  }

  @Post()
  @ApiOkResponse({ description: 'Creates or rotates a provider credential.' })
  upsertCredential(
    @Param('orgId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertProviderCredentialDto,
  ): Promise<ProviderCredential> {
    return this.providerCredentialsService.upsertCredential(organisationId, user.id, body);
  }

  @Post(':id/validate')
  @ApiOkResponse({ description: 'Validates a stored provider credential.' })
  validateCredential(
    @Param('orgId') organisationId: string,
    @Param('id') credentialId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProviderCredential> {
    return this.providerCredentialsService.validateCredential(
      organisationId,
      user.id,
      credentialId,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  deleteCredential(
    @Param('orgId') organisationId: string,
    @Param('id') credentialId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.providerCredentialsService.deleteCredential(organisationId, user.id, credentialId);
  }
}
