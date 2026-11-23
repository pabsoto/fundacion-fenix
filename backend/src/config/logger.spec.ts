import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  crearParametrosLogger,
  generarIdPeticion,
  nivelPorEstado,
  validarNivelLog,
} from './logger.js';

function simular(idEntrante?: string | string[]) {
  const req = {
    headers: idEntrante === undefined ? {} : { 'x-request-id': idEntrante },
  } as unknown as IncomingMessage;
  const cabeceras: Record<string, string> = {};
  const res = {
    setHeader: (nombre: string, valor: string) => {
      cabeceras[nombre] = valor;
    },
  } as unknown as ServerResponse;

  return { req, res, cabeceras };
}

describe('logger configuration', () => {
  describe('generarIdPeticion', () => {
    it('genera un UUID y lo devuelve en x-request-id', () => {
      const { req, res, cabeceras } = simular();

      const id = generarIdPeticion(req, res);

      expect(id).toMatch(/^[0-9a-f-]{36}$/);
      expect(cabeceras['x-request-id']).toBe(id);
    });

    it('reutiliza un x-request-id entrante válido', () => {
      const { req, res, cabeceras } = simular('cliente-abc_123.4');

      expect(generarIdPeticion(req, res)).toBe('cliente-abc_123.4');
      expect(cabeceras['x-request-id']).toBe('cliente-abc_123.4');
    });

    it.each(['con espacios', 'x'.repeat(129), 'a\nb', ''])(
      'descarta un id entrante inválido (%j)',
      (invalido) => {
        const { req, res, cabeceras } = simular(invalido);

        const id = generarIdPeticion(req, res);

        expect(id).not.toBe(invalido);
        expect(cabeceras['x-request-id']).toBe(id);
      },
    );
  });

  describe('nivelPorEstado', () => {
    it.each([
      [200, 'info'],
      [302, 'info'],
      [404, 'warn'],
      [499, 'warn'],
      [500, 'error'],
      [503, 'error'],
    ])('estado %i registra nivel %s', (estado, nivel) => {
      expect(nivelPorEstado(estado)).toBe(nivel);
    });

    it('registra como error cualquier excepción', () => {
      expect(nivelPorEstado(200, new Error('fallo'))).toBe('error');
    });
  });

  describe('validarNivelLog', () => {
    it('usa info por defecto', () => {
      expect(validarNivelLog(undefined)).toBe('info');
    });

    it('normaliza mayúsculas y espacios', () => {
      expect(validarNivelLog(' DEBUG ')).toBe('debug');
    });

    it('rechaza niveles desconocidos', () => {
      expect(() => validarNivelLog('verbose')).toThrow('LOG_LEVEL');
      expect(() => validarNivelLog('')).toThrow('LOG_LEVEL');
    });
  });

  describe('crearParametrosLogger', () => {
    it('aplica el nivel configurado y sólo usa pino-pretty en desarrollo', () => {
      const produccion = crearParametrosLogger('warn', 'production');
      const desarrollo = crearParametrosLogger('debug', 'development');

      expect(produccion.pinoHttp).toMatchObject({ level: 'warn' });
      expect(produccion.pinoHttp).not.toHaveProperty('transport');
      expect(desarrollo.pinoHttp).toMatchObject({
        level: 'debug',
        transport: { target: 'pino-pretty' },
      });
    });
  });
});
