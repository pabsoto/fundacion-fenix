/**
 * Procedimiento aislado de vinculación inicial de una identidad de Google con
 * una cuenta administrativa previamente aprobada.
 *
 * Este script NO es un endpoint HTTP y no forma parte del flujo de
 * autenticación del navegador. Se ejecuta de forma manual por la persona
 * responsable técnica de la fundación y exige un segundo factor de
 * autorización (el secreto `GOOGLE_LINK_AUTHORIZATION_TOKEN`) para escribir en
 * la base de datos.
 *
 * Uso (desde `backend/`):
 *
 *   1. Fase de verificación (no escribe nada):
 *      npm run auth:link -- --email=administrador@fundacionfenix.org
 *
 *   2. Fase de confirmación (escribe `google_sub`), con el `sub` revisado en
 *      la fase anterior y el secreto de autorización en el entorno:
 *      GOOGLE_LINK_AUTHORIZATION_TOKEN=... npm run auth:link -- --email=administrador@fundacionfenix.org --sub=1234567890 --confirm
 *
 * La URI de redirección `http://127.0.0.1:<puerto>/callback` debe estar
 * registrada en el cliente OAuth de Google Cloud Console.
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { createServer, type Server } from 'node:http';
import { randomBytes } from 'node:crypto';
import {
  calculatePKCECodeChallenge,
  randomPKCECodeVerifier,
} from 'openid-client';
import { AppModule } from '../app.module.js';
import { AlmacenTransaccionesOAuth } from '../modules/auth/oauth/oauth-transaction.store.js';
import { ClienteOAuthGoogleService } from '../modules/auth/oauth/google-oauth-client.service.js';
import { VerificadorIdTokenGoogleService } from '../modules/auth/oauth/google-token-verifier.service.js';
import { VinculacionGoogleService } from '../modules/administradores/services/vinculacion-google.service.js';
import type { IdentidadGoogleVerificada } from '../modules/administradores/dto/identidad-google-verificada.js';
import { resolverCallbackVinculacion } from './callback-vinculacion-google.js';

const TIEMPO_MAXIMO_MS = 10 * 60 * 1_000;

interface Argumentos {
  readonly email?: string;
  readonly sub?: string;
  readonly confirmar: boolean;
}

interface ServidorCallback {
  readonly server: Server;
  readonly url: URL;
}

interface RespuestaCallbackGoogle {
  readonly codigo: string;
  readonly issuer?: string;
}

async function main(): Promise<void> {
  cargarEntorno();

  const argumentos = leerArgumentos(process.argv.slice(2));
  if (!argumentos.email) {
    throw new Error(
      'Debe indicar el correo administrativo con --email=correo@ejemplo.org',
    );
  }

  const aplicacion = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const dataSource = aplicacion.get(DataSource);
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }

    const cliente = aplicacion.get(ClienteOAuthGoogleService);
    const verificador = aplicacion.get(VerificadorIdTokenGoogleService);
    const transacciones = aplicacion.get(AlmacenTransaccionesOAuth);
    const vinculacion = aplicacion.get(VinculacionGoogleService);

    const callback = resolverCallbackVinculacion(process.env);
    const servidor = await iniciarServidor(callback);

    try {
      const identidad = await completarFlujo(
        servidor,
        cliente,
        verificador,
        transacciones,
      );

      console.log('');
      console.log('Identidad de Google verificada:');
      console.log(`  correo: ${identidad.email}`);
      console.log(`  sub:    ${identidad.sub}`);

      const preparacion = await vinculacion.preparar(
        argumentos.email,
        identidad,
      );
      console.log('');
      console.log('Cuenta administrativa aprobada:');
      console.log(`  id:     ${preparacion.administradorId}`);
      console.log(`  nombre: ${preparacion.nombre}`);
      console.log(`  correo: ${preparacion.email}`);

      if (!argumentos.confirmar) {
        console.log('');
        console.log(
          'Fase de verificación finalizada. No se modificó ningún registro.',
        );
        console.log(
          'Revise el valor `sub` y, si es correcto, ejecute de nuevo con --sub=<SUB> --confirm y el secreto GOOGLE_LINK_AUTHORIZATION_TOKEN.',
        );
        return;
      }

      if (!argumentos.sub) {
        throw new Error(
          'Debe indicar el valor --sub=<SUB> revisado en la fase de verificación',
        );
      }

      const secreto = process.env.GOOGLE_LINK_AUTHORIZATION_TOKEN;
      if (!secreto) {
        throw new Error(
          'GOOGLE_LINK_AUTHORIZATION_TOKEN es obligatoria para confirmar la vinculación',
        );
      }

      if (argumentos.sub !== preparacion.sub) {
        throw new Error(
          'El valor --sub indicado no coincide con la identidad de Google verificada',
        );
      }

      const administrador = await vinculacion.confirmar({
        administradorId: preparacion.administradorId,
        sub: preparacion.sub,
        identidad,
      });

      console.log('');
      console.log(
        `Identidad de Google vinculada a ${administrador.email} (${administrador.id}).`,
      );
    } finally {
      await new Promise<void>((resolve) => {
        servidor.server.close(() => resolve());
      });
    }
  } finally {
    await aplicacion.close();
  }
}

async function completarFlujo(
  servidor: ServidorCallback,
  cliente: ClienteOAuthGoogleService,
  verificador: VerificadorIdTokenGoogleService,
  transacciones: AlmacenTransaccionesOAuth,
): Promise<IdentidadGoogleVerificada> {
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const codeVerifier = randomPKCECodeVerifier();

  transacciones.registrar({
    state,
    nonce,
    codeVerifier,
    vinculacionNavegador: 'vinculacion-cli',
    creadaEn: Date.now(),
    expiraEn: Date.now() + TIEMPO_MAXIMO_MS,
  });

  const url = await cliente.construirUrlAutorizacion({
    state,
    nonce,
    codeChallenge: await calculatePKCECodeChallenge(codeVerifier),
    redirectUri: servidor.url.toString(),
  });

  console.log('');
  console.log('Abre la siguiente URL en el navegador con la cuenta de Google:');
  console.log(url.toString());

  const respuesta = await esperarCallback(servidor.server, servidor.url);
  const consumo = transacciones.consumir(state);
  if (consumo.estado !== 'encontrada') {
    throw new Error('La solicitud de vinculación no está vigente');
  }

  const { idToken } = await cliente.canjearCodigo({
    code: respuesta.codigo,
    codeVerifier: consumo.transaccion.codeVerifier,
    state: consumo.transaccion.state,
    issuer: respuesta.issuer,
    nonce: consumo.transaccion.nonce,
    redirectUri: servidor.url.toString(),
  });

  return verificador.verificar(idToken, { nonce: consumo.transaccion.nonce });
}

function iniciarServidor(callback: URL): Promise<ServidorCallback> {
  return new Promise((resolve, reject) => {
    const server = createServer(() => {
      // La respuesta se emite dentro de `esperarCallback`.
    });

    server.on('error', reject);
    server.listen(Number(callback.port), callback.hostname, () => {
      resolve({
        server,
        url: callback,
      });
    });
  });
}

function esperarCallback(
  server: Server,
  redirectUri: URL,
): Promise<RespuestaCallbackGoogle> {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => {
      reject(new Error('Tiempo de espera agotado para la respuesta de Google'));
    }, TIEMPO_MAXIMO_MS);

    server.on('request', (request, response) => {
      const url = new URL(request.url ?? '/', redirectUri.origin);

      if (url.pathname !== redirectUri.pathname) {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Ruta inválida.\n');
        return;
      }

      const codigo = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        clearTimeout(temporizador);
        response.writeHead(400, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Google devolvió un error.\n');
        reject(new Error(`Google devolvió el error: ${error}`));
        return;
      }

      if (!codigo) {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        });
        response.end('Parámetros inválidos.\n');
        return;
      }

      clearTimeout(temporizador);
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Identidad recibida. Puedes cerrar esta ventana.\n');
      resolve({
        codigo,
        issuer: url.searchParams.get('iss') ?? undefined,
      });
    });
  });
}

function leerArgumentos(argumentos: string[]): Argumentos {
  let email: string | undefined;
  let sub: string | undefined;
  let confirmar = false;

  for (const argumento of argumentos) {
    if (argumento.startsWith('--email=')) {
      email = argumento.slice('--email='.length).trim();
    } else if (argumento.startsWith('--sub=')) {
      sub = argumento.slice('--sub='.length).trim();
    } else if (argumento === '--confirm') {
      confirmar = true;
    } else {
      throw new Error(`Argumento desconocido: ${argumento}`);
    }
  }

  return { email, sub, confirmar };
}

function cargarEntorno(): void {
  try {
    process.loadEnvFile();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }
}

await main();
