import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { CABECERA_CSRF } from '../common/guards/csrf.guard.js';
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
  app.use(cookieParser(config.get<string>('GOOGLE_OAUTH_STATE_SECRET')));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization', CABECERA_CSRF],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: allowedOrigins,
  });
}
