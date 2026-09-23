import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable HTTP response compression (gzip / deflate / brotli)
  app.use(compression());

  const port = configService.get<number>('port') || 4000;
  const apiPrefix = configService.get<string>('apiPrefix') || 'v1';
  const corsOrigins = configService.get<string[]>('corsOrigins') || [
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  // Set global API prefix (e.g. /v1)
  app.setGlobalPrefix(apiPrefix);

  // Enable CORS for web dashboard and browser extensions
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, extensions)
      if (!origin) return callback(null, true);
      // Allow browser extension schemes and configured origins
      if (
        origin.startsWith('chrome-extension://') ||
        origin.startsWith('moz-extension://') ||
        corsOrigins.includes(origin) ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
  });

  // Register production interceptors and exception filters
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Vocabulary API is running on: http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
