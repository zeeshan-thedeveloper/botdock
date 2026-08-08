import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Bot, BotsResponse } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { BotsService } from './bots.service.js';
import { CreateBotDto, UpdateBotDto } from './bots.dto.js';

@ApiTags('bots')
@UseGuards(SessionAuthGuard)
@Controller()
export class BotsController {
  constructor(@Inject(BotsService) private readonly botsService: BotsService) {}

  @Get('organisations/:orgId/bots')
  @ApiOkResponse({ description: 'Workspace bots with model configuration.' })
  listBots(
    @Param('orgId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BotsResponse> {
    return this.botsService.listBots(organisationId, user.id);
  }

  @Post('bots')
  @ApiOkResponse({ description: 'Creates a bot with optional model configuration.' })
  createBot(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateBotDto): Promise<Bot> {
    return this.botsService.createBot(user.id, body);
  }

  @Patch('organisations/:orgId/bots/:id')
  @ApiOkResponse({ description: 'Updates bot configuration.' })
  updateBot(
    @Param('orgId') organisationId: string,
    @Param('id') botId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateBotDto,
  ): Promise<Bot> {
    return this.botsService.updateBot(organisationId, user.id, botId, body);
  }

  @Post('organisations/:orgId/bots/:id/publish')
  @ApiOkResponse({ description: 'Publishes the draft config as a new immutable version.' })
  publishBot(
    @Param('orgId') organisationId: string,
    @Param('id') botId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Bot> {
    return this.botsService.publishBot(organisationId, user.id, botId);
  }
}
