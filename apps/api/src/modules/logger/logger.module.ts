import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from '@botdock/logger';

@Global()
@Module({
  providers: [
    {
      provide: 'LOGGER',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createLogger('botdock-api', configService.get<string>('LOG_LEVEL', 'info')),
    },
  ],
  exports: ['LOGGER'],
})
export class LoggerModule {}
