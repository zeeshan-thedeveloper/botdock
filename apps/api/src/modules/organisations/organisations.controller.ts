import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ListMyOrganisationsResponse } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { OrganisationsService } from './organisations.service.js';

@ApiTags('organisations')
@UseGuards(SessionAuthGuard)
@Controller('organisations')
export class OrganisationsController {
  constructor(
    @Inject(OrganisationsService) private readonly organisationsService: OrganisationsService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "The current user's organisations." })
  async listMine(@CurrentUser() user: AuthenticatedUser): Promise<ListMyOrganisationsResponse> {
    return { organisations: await this.organisationsService.listMine(user.id) };
  }
}
