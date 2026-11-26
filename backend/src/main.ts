import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { pino } from 'pino';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module.js';
import { trazaDeError } from './common/utils/traza-error.js';
import { configureApplication } from './config/configure-application.js';
import { configureSwagger } from './config/swagger.js';

const logger = new NestLogger('Bootstrap');

async function bootstrap() {
  // Con `abortOnError: false` un fallo de arranque llega al `catch` final en
  // lugar de terminar el proceso antes de poder registrarlo.
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  configureApplication(app, config);
  configureSwagger(app, config);

  const dataSource = app.get(DataSource);
  if (!dataSource.isInitialized) {
    try {
      await dataSource.initialize();
    } catch (error) {
      logger.error(
        { evento: 'base_datos_no_disponible', stack: trazaDeError(error) },
        'No se pudo inicializar la base de datos al arrancar; el servicio de salud reintentará la conexión',
      );
    }
  }

  const puerto = config.getOrThrow<number>('PORT');
  await app.listen(puerto);

  logger.log(
    {
      evento: 'aplicacion_iniciada',
      puerto,
      entorno: config.get<string>('NODE_ENV'),
    },
    'Aplicación iniciada',
  );
}

try {
  await bootstrap();
} catch (error) {
  // El logger de la aplicación puede no existir todavía.
  pino().fatal(
    { evento: 'arranque_fallido', stack: trazaDeError(error) },
    'No se pudo arrancar la aplicación',
  );
  process.exit(1);
}
