import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { BotsController } from './bots.controller.js';
import { BotsService } from './bots.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BotsController],
  providers: [BotsService, SessionAuthGuard],
})
export class BotsModule {}
