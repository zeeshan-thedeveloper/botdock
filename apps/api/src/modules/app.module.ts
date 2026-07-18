import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { apiEnvironmentSchema } from '@botdock/config';
import { HealthModule } from './health/health.module.js';
import { LoggerModule } from './logger/logger.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => apiEnvironmentSchema.parse(config),
    }),
    LoggerModule,
    HealthModule,
  ],
})
export class AppModule {}
