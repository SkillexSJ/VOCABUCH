import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor';
import compression from 'compression';

let cachedServer: any = null;

async function bootstrapServer() {
  if (!cachedServer) {
    const adapter = new ExpressAdapter();
    const app = await NestFactory.create(AppModule, adapter);

    app.use(compression());
    app.setGlobalPrefix('v1');

    app.enableCors({
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    });

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(
      new LoggingInterceptor(),
      new TransformInterceptor(),
    );

    await app.init();
    cachedServer = adapter.getInstance();
  }
  return cachedServer;
}

export default async function handler(req: any, res: any) {
  const server = await bootstrapServer();
  return server(req, res);
}
