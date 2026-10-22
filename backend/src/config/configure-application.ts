import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GlobalExceptionFilter } from '../common/filters/global-exception.filter.js';
import { parseAllowedOrigins } from './environment.js';

export function configureApplication(
  app: INestApplication,
  config: ConfigService,
): void {
  const allowedOrigins = parseAllowedOrigins(
    config.getOrThrow<string>('CORS_ALLOWED_ORIGINS'),
  );

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: allowedOrigins,
  });
}
