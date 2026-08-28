import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { OrganisationsController } from './organisations.controller.js';
import { OrganisationsService } from './organisations.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [OrganisationsController],
  providers: [OrganisationsService, SessionAuthGuard],
})
export class OrganisationsModule {}
