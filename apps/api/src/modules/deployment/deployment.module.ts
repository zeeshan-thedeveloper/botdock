import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SessionAuthGuard } from '../auth/session-auth.guard.js';
import { DatabaseModule } from '../database/database.module.js';
import { DeploymentController } from './deployment.controller.js';
import { DeploymentService } from './deployment.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DeploymentController],
  providers: [DeploymentService, SessionAuthGuard],
})
export class DeploymentModule {}
