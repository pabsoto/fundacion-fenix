import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { GoogleAuthError } from '../../modules/auth/oauth/google-auth.errors.js';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        originalUrl: '/api/admin/campanas?code=secreto-en-consulta',
      }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  let error: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  function registrado(espia: ReturnType<typeof vi.spyOn>) {
    expect(espia).toHaveBeenCalledTimes(1);
    return espia.mock.calls[0]?.[0] as Record<string, unknown>;
  }

  it('registra un error no controlado con su stack y responde 500', () => {
    new GlobalExceptionFilter().catch(new Error('fallo interno'), host);

    const datos = registrado(error);
    expect(datos).toMatchObject({
      evento: 'error_http',
      statusCode: 500,
      metodo: 'POST',
      ruta: '/api/admin/campanas',
    });
    expect(datos.stack).toContain('Error: fallo interno\n    at ');
    expect(warn).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls)).not.toContain('fallo interno');
  });

  it('registra un 5xx controlado con el stack de su causa', () => {
    const causa = Object.assign(new Error('conexión rechazada'), {
      parameters: ['dato-sensible'],
    });

    new GlobalExceptionFilter().catch(
      new ServiceUnavailableException('No disponible', { cause: causa }),
      host,
    );

    const datos = registrado(error);
    expect(datos.statusCode).toBe(503);
    expect(datos.stack).toContain('ServiceUnavailableException');
    expect(datos.stack).toContain('Causado por: Error: conexión rechazada');
    // Las propiedades del error original no se serializan.
    expect(JSON.stringify(datos)).not.toContain('dato-sensible');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Service Unavailable',
        message: 'No disponible',
      }),
    );
  });

  it('registra un 4xx como advertencia, sin stack, mensaje ni consulta', () => {
    new GlobalExceptionFilter().catch(
      new BadRequestException('el valor recibido-123 no es válido'),
      host,
    );

    const datos = registrado(warn);
    expect(datos).toEqual({
      evento: 'error_http',
      statusCode: 400,
      metodo: 'POST',
      ruta: '/api/admin/campanas',
      error: 'BadRequestException',
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('recibido-123');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      'secreto-en-consulta',
    );
    expect(error).not.toHaveBeenCalled();
  });

  it('añade el código interno de los errores de autenticación', () => {
    new GlobalExceptionFilter().catch(
      new GoogleAuthError('state_invalido', 'Estado inválido'),
      host,
    );

    expect(registrado(warn).codigo).toBe('state_invalido');
  });
});
