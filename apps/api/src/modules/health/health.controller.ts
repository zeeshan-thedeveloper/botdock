import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@botdock/contracts';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'API health status.' })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'botdock-api',
      timestamp: new Date().toISOString(),
    };
  }
}
