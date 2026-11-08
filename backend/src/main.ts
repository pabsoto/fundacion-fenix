import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { configureApplication } from './config/configure-application.js';
import { configureSwagger } from './config/swagger.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApplication(app, config);
  configureSwagger(app, config);


  const dataSource = app.get(DataSource);
  if (!dataSource.isInitialized) {
    try {
      await dataSource.initialize();
    } catch (error) {
      logger.error(
        'No se pudo inicializar la base de datos al arrancar; el servicio de salud reintentará la conexión',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  await app.listen(config.getOrThrow<number>('PORT'));
}
await bootstrap();
