import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from '@nestjs/swagger';

export const SWAGGER_UI_PATH = 'api/docs';
export const OPENAPI_JSON_PATH = 'api/docs/openapi.json';

export function isSwaggerEnabled(config: ConfigService): boolean {
  const environment = config.get<string>('NODE_ENV') ?? 'development';
  const explicitSetting = config.get<string>('SWAGGER_ENABLED');

  if (environment === 'production') {
    return explicitSetting === 'true';
  }

  return explicitSetting !== 'false';
}

export function createOpenApiDocument(
  app: INestApplication,
  config: ConfigService,
): OpenAPIObject {
  const cookieName =
    config.get<string>('SESSION_COOKIE_NAME') ?? 'fenix_session';
  const documentConfig = new DocumentBuilder()
    .setTitle('Fundación FÉNIX LPB — API REST')
    .setDescription(
      'Backend público y administrativo de Fundación FÉNIX LPB. La administración usa una cookie de sesión HttpOnly obtenida mediante Google OAuth; las escrituras también requieren X-CSRF-Token. Swagger UI no puede establecer manualmente la cookie HttpOnly: el navegador la enviará automáticamente después de iniciar sesión en /api/auth/google.',
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:3000', 'Desarrollo local')
    .addTag('Health', 'Estado del backend y de PostgreSQL.')
    .addTag(
      'Autenticación',
      'Google OAuth, sesión administrativa y cierre de sesión.',
    )
    .addTag('Administración', 'Operaciones generales del panel administrativo.')
    .addTag(
      'Contenido institucional',
      'Contenido institucional público bilingüe.',
    )
    .addTag('Donaciones públicas', 'Datos oficiales públicos para donaciones.')
    .addTag('Contactos públicos', 'Canales de contacto públicos activos.')
    .addTag(
      'Donaciones administrativas',
      'Consulta y edición protegida de donaciones.',
    )
    .addCookieAuth(
      cookieName,
      {
        type: 'apiKey',
        in: 'cookie',
        description:
          'Cookie HttpOnly emitida por el callback de Google OAuth. El navegador la envía automáticamente; no se copia en Swagger UI.',
      },
      'cookieAuth',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description:
          'Token devuelto por GET /api/auth/me. Se exige junto con la cookie de sesión en operaciones de escritura.',
      },
      'csrfToken',
    )
    .build();

  return SwaggerModule.createDocument(app, documentConfig);
}

export function configureSwagger(
  app: INestApplication,
  config: ConfigService,
): OpenAPIObject | null {
  if (!isSwaggerEnabled(config)) return null;

  const document = createOpenApiDocument(app, config);
  SwaggerModule.setup(SWAGGER_UI_PATH, app, document, {
    customSiteTitle: 'Fundación FÉNIX LPB — API REST',
    jsonDocumentUrl: OPENAPI_JSON_PATH,
    swaggerOptions: {
      persistAuthorization: false,
      withCredentials: true,
      displayRequestDuration: true,
      operationsSorter: 'method',
      tagsSorter: 'alpha',
    },
  });

  return document;
}
