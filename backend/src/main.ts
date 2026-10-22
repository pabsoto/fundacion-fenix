import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { configureApplication } from './config/configure-application.js';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  configureApplication(app, config);

  // La conexión se establece de forma explícita y determinista al arrancar.
  // TypeORM está configurado con `manualInitialization: true`, por lo que
  // nadie más la inicializa: sin este paso, la primera petición que llegue
  // antes de un `GET /api/health` fallaría con un 503 aunque la base de
  // datos esté perfectamente disponible.
  //
  // Si la base de datos no está disponible en el arranque, la aplicación
  // arranca igualmente (para que el comprobador de salud pueda informar del
  // estado) y el servicio de salud reintenta la inicialización.
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
