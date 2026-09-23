import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import express from 'express';
import { Express } from 'express';
import { IncomingMessage, ServerResponse } from 'http';

let cachedApp: Express;

async function createApp(): Promise<Express> {
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.use(compression());

  const apiPrefix = configService.get<string>('apiPrefix') || 'v1';
  const corsOrigins = configService.get<string[]>('corsOrigins') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('moz-extension://') ||
        corsOrigins.includes(origin) ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  await app.init();

  return expressApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!cachedApp) {
    cachedApp = await createApp();
  }
  cachedApp(req, res);
}
