import { Body, Controller, Delete, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { AllowedDomain, AllowedDomainsResponse, DeploymentInfo } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateAllowedDomainDto } from './allowed-domain.dto.js';
import { DeploymentService } from './deployment.service.js';

@ApiTags('deployment')
@UseGuards(SessionAuthGuard)
@Controller('organisations/:orgId/bots/:botId')
export class DeploymentController {
  constructor(@Inject(DeploymentService) private readonly deploymentService: DeploymentService) {}

  @Get('allowed-domains')
  @ApiOkResponse({ description: 'Domains this bot may be embedded on.' })
  listAllowedDomains(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AllowedDomainsResponse> {
    return this.deploymentService.listAllowedDomains(organisationId, botId, user.id);
  }

  @Post('allowed-domains')
  @ApiOkResponse({ description: 'Registers a domain this bot may be embedded on.' })
  createAllowedDomain(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateAllowedDomainDto,
  ): Promise<AllowedDomain> {
    return this.deploymentService.createAllowedDomain(organisationId, botId, user.id, body);
  }

  @Delete('allowed-domains/:id')
  @ApiOkResponse({ description: 'Removes a registered domain.' })
  deleteAllowedDomain(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @Param('id') domainId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.deploymentService.deleteAllowedDomain(organisationId, botId, domainId, user.id);
  }

  @Get('deployment')
  @ApiOkResponse({ description: 'The bot\'s PRODUCTION deployment and embed snippet.' })
  getDeploymentInfo(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DeploymentInfo> {
    return this.deploymentService.getDeploymentInfo(organisationId, botId, user.id);
  }
}
