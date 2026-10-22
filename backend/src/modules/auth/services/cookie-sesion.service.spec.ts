import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { vi } from 'vitest';
import type { Request, Response } from 'express';
import { CookieSesionService } from './cookie-sesion.service.js';
import { generarToken, resumirToken } from './sesion-admin.service.js';

const CONFIGURACION = {
  AUTH_REDIRECT_URL: 'http://localhost:5173/admin',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173',
  NODE_ENV: 'test',
  SESSION_COOKIE_NAME: 'fenix_session',
  SESSION_COOKIE_PATH: '/api',
  SESSION_COOKIE_SAMESITE: 'lax',
  SESSION_COOKIE_SECURE: 'false',
  SESSION_IDLE_TIMEOUT_SECONDS: '1800',
  SESSION_ABSOLUTE_TIMEOUT_SECONDS: '43200',
  SESSION_ROTATION_INTERVAL_SECONDS: '300',
};

describe('CookieSesionService', () => {
  function crearServicio(valores: Record<string, string | undefined> = {}): {
    establecer: (response: Response, token: string, expiraEn: Date) => void;
    eliminar: (response: Response) => void;
    leerToken: (request: Request) => string | undefined;
  } {
    const config = {
      get: (clave: string) => valores[clave] ?? CONFIGURACION[clave],
    } as unknown as ConfigService;

    return new CookieSesionService(config);
  }

  function respuestaFalsa(): {
    response: Response;
    llamadas: Array<{ nombre: string; valor: string; opciones: unknown }>;
  } {
    const llamadas: Array<{
      nombre: string;
      valor: string;
      opciones: unknown;
    }> = [];

    const response = {
      cookie: (nombre: string, valor: string, opciones: unknown) => {
        llamadas.push({ nombre, valor, opciones });
      },
      clearCookie: (nombre: string, opciones: unknown) => {
        llamadas.push({ nombre, valor: '', opciones });
      },
    } as unknown as Response;

    return { response, llamadas };
  }

  it('emite una cookie HttpOnly con SameSite y Path configurados', () => {
    const servicio = crearServicio();
    const { response, llamadas } = respuestaFalsa();

    servicio.establecer(
      response,
      'token-de-sesion',
      new Date(Date.now() + 1_800_000),
    );

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].nombre).toBe('fenix_session');
    expect(llamadas[0].valor).toBe('token-de-sesion');
    expect(llamadas[0].opciones).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api',
    });
    expect(llamadas[0].opciones).not.toHaveProperty('domain');
  });

  it('marca la cookie como Secure cuando la configuración lo exige', () => {
    const servicio = crearServicio({ SESSION_COOKIE_SECURE: 'true' });
    const { response, llamadas } = respuestaFalsa();

    servicio.establecer(
      response,
      'token-de-sesion',
      new Date(Date.now() + 1_800_000),
    );

    expect(llamadas[0].opciones).toMatchObject({
      httpOnly: true,
      secure: true,
    });
  });

  it('no incluye el dominio cuando la cookie es host-only', () => {
    const servicio = crearServicio();
    const { response, llamadas } = respuestaFalsa();

    servicio.establecer(
      response,
      'token-de-sesion',
      new Date(Date.now() + 1_800_000),
    );

    expect(llamadas[0].opciones).not.toHaveProperty('domain');
  });

  it('elimina la cookie con los mismos atributos con los que se emitió', () => {
    const servicio = crearServicio({ SESSION_COOKIE_SECURE: 'true' });
    const { response, llamadas } = respuestaFalsa();

    servicio.eliminar(response);

    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].nombre).toBe('fenix_session');
    expect(llamadas[0].opciones).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/api',
    });
  });

  it('no guarda el token de Google ni datos sensibles en la cookie', () => {
    const servicio = crearServicio();
    const { response, llamadas } = respuestaFalsa();
    const token = generarToken();

    servicio.establecer(response, token, new Date(Date.now() + 1_800_000));

    const valor = String(llamadas[0].valor);
    expect(valor).toBe(token);
    expect(valor).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(valor).not.toContain('access_token');
    expect(valor).not.toContain('id_token');
    expect(valor).not.toContain('sub-');
  });

  it('lee el identificador de sesión de la petición', () => {
    const servicio = crearServicio();

    expect(
      servicio.leerToken({ cookies: { fenix_session: 'token' } } as Request),
    ).toBe('token');
    expect(servicio.leerToken({ cookies: {} } as Request)).toBeUndefined();
  });
});

describe('utilidades de sesión', () => {
  it('el resumen SHA-256 es determinista y no reversible', () => {
    const token = 'token-de-sesion';
    expect(resumirToken(token)).toBe(
      createHash('sha256').update(token, 'utf8').digest('hex'),
    );
    expect(resumirToken(token)).not.toContain(token);
    expect(resumirToken(token)).toHaveLength(64);
  });

  it('el identificador de sesión es aleatorio y opaco', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generarToken()));

    expect(tokens.size).toBe(50);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
    expect(vi.isMockFunction(generarToken)).toBe(false);
  });
});
