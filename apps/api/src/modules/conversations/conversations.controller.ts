import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { ConversationDetailResponse, ConversationsListResponse } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { ListConversationsQueryDto } from './conversations.dto.js';

@ApiTags('conversations')
@UseGuards(SessionAuthGuard)
@Controller('organisations/:orgId/conversations')
export class ConversationsController {
  constructor(@Inject(ConversationsService) private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOkResponse({ description: 'Cursor-paginated conversations for the workspace.' })
  listConversations(
    @Param('orgId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConversationsQueryDto,
  ): Promise<ConversationsListResponse> {
    return this.conversationsService.listConversations(organisationId, user.id, query);
  }

  @Get(':conversationId')
  @ApiOkResponse({ description: 'Full conversation transcript with citations and per-message usage.' })
  getConversation(
    @Param('orgId') organisationId: string,
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConversationDetailResponse> {
    return this.conversationsService.getConversation(organisationId, user.id, conversationId);
  }
}
