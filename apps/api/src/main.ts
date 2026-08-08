import 'reflect-metadata';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './modules/app.module.js';
import { AllExceptionsFilter } from './shared/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);

  // Stable, unversioned embed URL (see deployment.service.ts) — the widget
  // bundle baked into this image's Docker build at infrastructure/docker/api.Dockerfile.
  // A plain <script defer src=...> load isn't subject to CORS, so no headers
  // needed here beyond a correct content type.
  app.useStaticAssets(join(process.cwd(), 'public'), {
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('widget.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300');
      }
    },
  });
  const corsOrigins = configService
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim());

  // The public widget (/public/*) is embedded on arbitrary tenant-owned
  // domains unknown at boot time, so it can't use the static app-origin
  // allowlist below. It never uses cookies/credentials, so reflecting the
  // request's Origin back is safe at the CORS layer; the actual per-bot
  // domain restriction is enforced inside WidgetController via
  // isOriginAllowed, which is the real access-control decision — CORS
  // headers alone only affect what a *browser* lets JS read, not what a
  // direct/non-browser caller can do.
  app.enableCors((request: { url?: string }, callback: (error: Error | null, options: object) => void) => {
    if (request.url?.startsWith('/public/')) {
      callback(null, { origin: true, credentials: false, exposedHeaders: ['X-BotDock-Visitor-Id'] });
      return;
    }

    callback(null, { origin: corsOrigins, credentials: true });
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidUnknownValues: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('BotDock API')
    .setDescription('Foundation API for the BotDock chatbot platform.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApiConfig));

  await app.listen(configService.getOrThrow<number>('PORT'));
}

void bootstrap();
