import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PostgresDataSourceOptions } from 'typeorm/driver/postgres/PostgresDataSourceOptions.js';
import { Administrador } from '../modules/administradores/entities/administrador.entity.js';
import { Auditoria } from '../modules/auditoria/entities/auditoria.entity.js';
import { SesionAdmin } from '../modules/auth/entities/sesion-admin.entity.js';
import { CanalContacto } from '../modules/canales-contacto/entities/canal-contacto.entity.js';
import { ContenidoInstitucional } from '../modules/contenido-institucional/entities/contenido-institucional.entity.js';
import { DatoDonacion } from '../modules/donaciones/entities/dato-donacion.entity.js';

export const DATABASE_ENTITIES = [
  Administrador,
  Auditoria,
  DatoDonacion,
  ContenidoInstitucional,
  CanalContacto,
  SesionAdmin,
];

function getRequiredDatabaseUrl(environment: NodeJS.ProcessEnv): string {
  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error('DATABASE_URL es obligatoria');
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL debe ser una URI PostgreSQL válida');
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL debe utilizar el protocolo PostgreSQL');
  }

  const sslParameters = ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey'];
  if (sslParameters.some((parameter) => parsed.searchParams.has(parameter))) {
    throw new Error(
      'DATABASE_URL no debe contener parámetros SSL; utiliza DATABASE_CA_CERT_PATH',
    );
  }

  return databaseUrl;
}

function loadCertificateAuthority(
  environment: NodeJS.ProcessEnv,
): Buffer | undefined {
  const certificatePath = environment.DATABASE_CA_CERT_PATH?.trim();
  if (!certificatePath) {
    return undefined;
  }

  const certificate = readFileSync(certificatePath);
  let parsedCertificate: X509Certificate;
  try {
    parsedCertificate = new X509Certificate(certificate);
  } catch {
    throw new Error(
      'DATABASE_CA_CERT_PATH no contiene un certificado X.509 válido',
    );
  }

  if (!parsedCertificate.ca) {
    throw new Error('DATABASE_CA_CERT_PATH debe contener un certificado CA');
  }

  const now = Date.now();
  const validFrom = Date.parse(parsedCertificate.validFrom);
  const validTo = Date.parse(parsedCertificate.validTo);
  if (now < validFrom || now > validTo) {
    throw new Error(
      'El certificado configurado en DATABASE_CA_CERT_PATH no está vigente',
    );
  }

  return certificate;
}

export function createDatabaseOptions(
  environment: NodeJS.ProcessEnv,
): PostgresDataSourceOptions {
  const certificateAuthority = loadCertificateAuthority(environment);

  return {
    type: 'postgres',
    url: getRequiredDatabaseUrl(environment),
    schema: 'public',
    entities: DATABASE_ENTITIES,
    synchronize: false,
    dropSchema: false,
    migrationsRun: false,
    installExtensions: false,
    logging: false,
    connectTimeoutMS: 5_000,
    ssl: {
      rejectUnauthorized: true,
      ...(certificateAuthority ? { ca: certificateAuthority } : {}),
    },
  };
}

export function createNestTypeOrmOptions(
  environment: NodeJS.ProcessEnv,
): TypeOrmModuleOptions {
  return {
    ...createDatabaseOptions(environment),
    autoLoadEntities: false,
    manualInitialization: true,
  };
}
