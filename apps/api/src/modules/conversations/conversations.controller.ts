import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type {
  ActivityTimeseriesResponse,
  ConversationDetailResponse,
  ConversationsListResponse,
  MessageFeedbackResponse,
} from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { ConversationsService } from './conversations.service.js';
import { ListConversationsQueryDto, SetMessageFeedbackDto } from './conversations.dto.js';

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

  @Get('timeseries')
  @ApiOkResponse({ description: 'Real, zero-filled daily conversation/message counts for the last 30 days.' })
  getActivityTimeseries(
    @Param('orgId') organisationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ActivityTimeseriesResponse> {
    return this.conversationsService.getActivityTimeseries(organisationId, user.id);
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

  @Patch(':conversationId/messages/:messageId/feedback')
  @ApiOkResponse({ description: 'Records thumbs up/down feedback on an assistant message.' })
  setMessageFeedback(
    @Param('orgId') organisationId: string,
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: SetMessageFeedbackDto,
  ): Promise<MessageFeedbackResponse> {
    return this.conversationsService.setMessageFeedback(
      organisationId,
      user.id,
      conversationId,
      messageId,
      body.feedback,
    );
  }
}
