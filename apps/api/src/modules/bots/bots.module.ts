import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { BotsController } from './bots.controller.js';
import { BotsService } from './bots.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BotsController],
  providers: [BotsService],
})
export class BotsModule {}
