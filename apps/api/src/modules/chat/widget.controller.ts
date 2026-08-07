import { randomUUID } from 'node:crypto';
import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { isOriginAllowed } from '../deployment/origin.util.js';
import { ChatService } from './chat.service.js';
import { WidgetMessageDto } from './widget-message.dto.js';
import { WidgetRateLimitGuard } from './widget-rate-limit.guard.js';
import { WidgetService } from './widget.service.js';

const HEARTBEAT_INTERVAL_MS = 15_000;

@ApiTags('widget')
@UseGuards(WidgetRateLimitGuard)
@Controller('public/bots/:deploymentId')
export class WidgetController {
  constructor(
    @Inject(ChatService) private readonly chatService: ChatService,
    @Inject(WidgetService) private readonly widgetService: WidgetService,
  ) {}

  @Post('messages')
  async streamMessage(
    @Param('deploymentId') deploymentId: string,
    @Body() body: WidgetMessageDto,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const deployment = await this.widgetService.resolveDeployment(deploymentId);
    if (!deployment) {
      throw new NotFoundException('This bot is not published.');
    }

    const patterns = await this.widgetService.getAllowedPatterns(deployment.botId);
    const requestOrigin = request.headers.origin ?? null;

    if (!isOriginAllowed(requestOrigin, patterns)) {
      throw new ForbiddenException('This domain is not allowed to embed this bot.');
    }

    const visitorId = body.visitorId?.trim() || `visitor_${randomUUID()}`;

    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'X-BotDock-Visitor-Id': visitorId,
    });

    const controller = new AbortController();
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
        organisationId: deployment.organisationId,
        botId: deployment.botId,
        configVersion: 'published',
        conversationId: body.conversationId,
        visitorId,
        userMessage: body.message,
        source: 'WIDGET',
        debug: false,
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
}
