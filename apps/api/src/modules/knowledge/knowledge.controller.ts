import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { KnowledgeSource, KnowledgeSourcesResponse } from '@botdock/contracts';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { CreateKnowledgeSourceDto } from './knowledge.dto.js';
import { KnowledgeService } from './knowledge.service.js';

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

@ApiTags('knowledge')
@UseGuards(SessionAuthGuard)
@Controller('organisations/:orgId/bots/:botId/knowledge')
export class KnowledgeController {
  constructor(@Inject(KnowledgeService) private readonly knowledgeService: KnowledgeService) {}

  @Get()
  @ApiOkResponse({ description: 'Knowledge sources for this bot.' })
  listSources(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<KnowledgeSourcesResponse> {
    return this.knowledgeService.listSources(organisationId, botId, user.id);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
    }),
  )
  @ApiOkResponse({ description: 'Creates a knowledge source and enqueues ingestion.' })
  createSource(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreateKnowledgeSourceDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<KnowledgeSource> {
    return this.knowledgeService.createSource(organisationId, botId, user.id, body, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'Deletes a knowledge source and its objects/chunks.' })
  deleteSource(
    @Param('orgId') organisationId: string,
    @Param('botId') botId: string,
    @Param('id') sourceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.knowledgeService.deleteSource(organisationId, botId, sourceId, user.id);
  }
}
