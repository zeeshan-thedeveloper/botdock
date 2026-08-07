import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { PrismaService } from '../database/prisma.service.js';
import { ChatService } from './chat.service.js';
import { PlaygroundMessageDto } from './playground.dto.js';

const HEARTBEAT_INTERVAL_MS = 15_000;

@ApiTags('playground')
@UseGuards(SessionAuthGuard)
@Controller('organisations/:orgId/bots/:botId/playground')
export class PlaygroundController {
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Post('messages')
  async streamMessage(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PlaygroundMessageDto,
    @Res() response: Response,
  ): Promise<void> {
    await this.ensureOrganisationMember(organisationId, user.id);

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const controller = new AbortController();
    // The response's own 'close' (not the request's) reliably fires on client
    // disconnect mid-stream; guard against it also firing after our own
    // response.end() on normal completion.
    const onClose = () => {
      if (!response.writableEnded) {
        controller.abort();
      }
    };
    response.on('close', onClose);

    const heartbeat = setInterval(() => {
      response.write(': heartbeat\n\n');
    }, HEARTBEAT_INTERVAL_MS);

    try {
      for await (const event of this.chatService.runChat({
        organisationId,
        botId,
        configVersion: 'draft',
        conversationId: body.conversationId,
        userMessage: body.message,
        source: 'PLAYGROUND',
        debug: true,
        signal: controller.signal,
      })) {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } finally {
      clearInterval(heartbeat);
      response.off('close', onClose);
      response.end();
    }
  }

  private async ensureOrganisationMember(organisationId: string, userId: string) {
    const membership = await this.prisma.organisationMember.findUnique({
      where: { organisationId_userId: { organisationId, userId } },
      select: { id: true },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this organisation.');
    }
  }
}
