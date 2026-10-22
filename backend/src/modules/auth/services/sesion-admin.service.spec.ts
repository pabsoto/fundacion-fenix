import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import type { Repository } from 'typeorm';
import { SesionAdmin } from '../entities/sesion-admin.entity.js';
import {
  AlmacenSesionesNoDisponibleError,
  SesionAdminService,
  SesionDesconocidaError,
  SesionExpiradaError,
  SesionRevocadaError,
  generarToken,
  resumirToken,
} from './sesion-admin.service.js';

const ADMINISTRADOR_ID = '11111111-1111-1111-1111-111111111111';

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

/**
 * Repositorio en memoria que imita el comportamiento de TypeORM para la tabla
 * de sesiones: permite comprobar la lógica sin tocar PostgreSQL.
 */
class RepositorioFalso {
  readonly sesiones = new Map<string, SesionAdmin>();
  errorEnFind: Error | null = null;
  errorEnSave: Error | null = null;
  errorEnUpdate: Error | null = null;

  create(entidad: Partial<SesionAdmin>): SesionAdmin {
    const base: SesionAdmin = {
      id: randomUUID(),
      administradorId: '',
      tokenHash: '',
      csrfToken: '',
      creadaEn: new Date(),
      tokenEmitidoEn: new Date(),
      ultimaActividadEn: new Date(),
      expiraEn: new Date(),
      revocadaEn: null,
      motivoRevocacion: null,
    };

    return Object.assign(base, entidad);
  }

  async save(entidad: SesionAdmin): Promise<SesionAdmin> {
    if (this.errorEnSave) {
      throw this.errorEnSave;
    }

    this.sesiones.set(entidad.id, Object.assign({}, entidad));
    return entidad;
  }

  async findOne(opciones: {
    where: { tokenHash: string };
  }): Promise<SesionAdmin | null> {
    if (this.errorEnFind) {
      throw this.errorEnFind;
    }

    for (const sesion of this.sesiones.values()) {
      if (sesion.tokenHash === opciones.where.tokenHash) {
        return Object.assign({}, sesion);
      }
    }

    return null;
  }

  async update(
    criterio: string,
    parcial: Partial<SesionAdmin>,
  ): Promise<{ affected: number | undefined }> {
    if (this.errorEnUpdate) {
      throw this.errorEnUpdate;
    }

    const sesion = this.sesiones.get(criterio);
    if (!sesion) {
      return { affected: 0 };
    }

    this.sesiones.set(criterio, Object.assign({}, sesion, parcial));
    return { affected: 1 };
  }
}

describe('SesionAdminService', () => {
  let repositorio: RepositorioFalso;
  let servicio: SesionAdminService;

  function crearServicio(
    valores: Record<string, string | undefined> = {},
  ): SesionAdminService {
    const config = {
      get: (clave: string) => valores[clave] ?? CONFIGURACION[clave],
    } as unknown as ConfigService;

    return new SesionAdminService(
      repositorio as unknown as Repository<SesionAdmin>,
      config,
    );
  }

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    servicio = crearServicio();
  });

  describe('creación', () => {
    it('emite un identificador opaco y sólo persiste su resumen', async () => {
      const sesion = await servicio.crear(ADMINISTRADOR_ID);

      expect(sesion.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(sesion.token).not.toBe(sesion.csrfToken);
      expect(sesion.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const almacenada = [...repositorio.sesiones.values()][0];
      expect(almacenada.tokenHash).toBe(resumirToken(sesion.token));
      expect(almacenada.tokenHash).toBe(
        createHash('sha256').update(sesion.token, 'utf8').digest('hex'),
      );
      expect(JSON.stringify(almacenada)).not.toContain(sesion.token);
      expect(almacenada.administradorId).toBe(ADMINISTRADOR_ID);
      expect(almacenada.revocadaEn).toBeNull();
    });

    it('establece la caducidad máxima absoluta y la de inactividad', async () => {
      const antes = Date.now();
      const sesion = await servicio.crear(ADMINISTRADOR_ID);

      const limite = antes + 43_200 * 1_000;
      expect(sesion.expiraEn.getTime()).toBeGreaterThan(antes);
      expect(sesion.expiraEn.getTime()).toBeLessThanOrEqual(limite + 1_000);
    });

    it('genera un identificador distinto en cada sesión', async () => {
      const primera = await servicio.crear(ADMINISTRADOR_ID);
      const segunda = await servicio.crear(ADMINISTRADOR_ID);

      expect(primera.token).not.toBe(segunda.token);
      expect(primera.csrfToken).not.toBe(segunda.csrfToken);
    });

    it('no concede sesión cuando el almacén no está disponible', async () => {
      repositorio.errorEnSave = new Error('conexión rechazada');

      await expect(servicio.crear(ADMINISTRADOR_ID)).rejects.toBeInstanceOf(
        AlmacenSesionesNoDisponibleError,
      );
      expect(repositorio.sesiones.size).toBe(0);
    });
  });

  describe('validación', () => {
    it('acepta una sesión vigente y actualiza la última actividad', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      const validacion = await servicio.validar(emitida.token);

      expect(validacion.contexto.administradorId).toBe(ADMINISTRADOR_ID);
      expect(validacion.contexto.csrfToken).toBe(emitida.csrfToken);
      expect(validacion.requiereRotacion).toBe(false);

      const almacenada = [...repositorio.sesiones.values()][0];
      expect(almacenada.ultimaActividadEn.getTime()).toBeGreaterThanOrEqual(
        almacenada.creadaEn.getTime(),
      );
    });

    it('rechaza una cookie alterada', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const alterado = `${emitida.token.slice(0, -1)}${
        emitida.token.endsWith('A') ? 'B' : 'A'
      }`;

      await expect(servicio.validar(alterado)).rejects.toBeInstanceOf(
        SesionDesconocidaError,
      );
    });

    it('rechaza una sesión desconocida', async () => {
      await expect(servicio.validar(generarToken())).rejects.toBeInstanceOf(
        SesionDesconocidaError,
      );
    });

    it('rechaza una sesión revocada', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      await servicio.revocar(emitida.contexto, 'logout');

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionRevocadaError,
      );
    });

    it('rechaza una sesión que superó su tiempo máximo absoluto', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const almacenada = [...repositorio.sesiones.values()][0];
      almacenada.expiraEn = new Date(Date.now() - 1_000);
      repositorio.sesiones.set(almacenada.id, almacenada);

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionExpiradaError,
      );
    });

    it('rechaza una sesión que superó la caducidad por inactividad', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const almacenada = [...repositorio.sesiones.values()][0];
      almacenada.ultimaActividadEn = new Date(Date.now() - 1_801 * 1_000);
      repositorio.sesiones.set(almacenada.id, almacenada);

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionExpiradaError,
      );
    });

    it('falla de forma segura cuando PostgreSQL no está disponible', async () => {
      await servicio.crear(ADMINISTRADOR_ID);
      repositorio.errorEnFind = new Error('conexión rechazada');

      await expect(servicio.validar(generarToken())).rejects.toBeInstanceOf(
        AlmacenSesionesNoDisponibleError,
      );
    });

    it('falla de forma segura cuando no se puede actualizar la actividad', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      repositorio.errorEnUpdate = new Error('conexión rechazada');

      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        AlmacenSesionesNoDisponibleError,
      );
    });

    it('no filtra el token en los mensajes de error', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      repositorio.errorEnFind = new Error('conexión rechazada');

      const error = await servicio
        .validar(emitida.token)
        .catch((e: Error) => e);

      expect(error.message).not.toContain(emitida.token);
      expect(JSON.stringify(error)).not.toContain(emitida.token);
    });
  });

  describe('rotación', () => {
    it('renueva el identificador y invalida el anterior', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const validacion = await servicio.validar(emitida.token);

      const nuevo = await servicio.rotar(validacion.contexto);

      expect(nuevo).not.toBe(emitida.token);
      await expect(servicio.validar(emitida.token)).rejects.toBeInstanceOf(
        SesionDesconocidaError,
      );

      const trasRotacion = await servicio.validar(nuevo);
      expect(trasRotacion.contexto.id).toBe(validacion.contexto.id);
      expect(trasRotacion.contexto.csrfToken).toBe(emitida.csrfToken);
    });

    it('informa que la sesión requiere renovación tras el intervalo configurado', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      const almacenada = [...repositorio.sesiones.values()][0];
      almacenada.tokenEmitidoEn = new Date(Date.now() - 301 * 1_000);
      repositorio.sesiones.set(almacenada.id, almacenada);

      const validacion = await servicio.validar(emitida.token);

      expect(validacion.requiereRotacion).toBe(true);
    });

    it('no renueva si el intervalo está desactivado', async () => {
      const servicioSinRotacion = crearServicio({
        SESSION_ROTATION_INTERVAL_SECONDS: '0',
      });
      const emitida = await servicioSinRotacion.crear(ADMINISTRADOR_ID);
      const almacenada = [...repositorio.sesiones.values()][0];
      almacenada.tokenEmitidoEn = new Date(Date.now() - 100_000 * 1_000);
      repositorio.sesiones.set(almacenada.id, almacenada);

      const validacion = await servicioSinRotacion.validar(emitida.token);

      expect(validacion.requiereRotacion).toBe(false);
    });
  });

  describe('revocación', () => {
    it('registra el motivo y el instante de revocación', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);

      await servicio.revocar(emitida.contexto, 'logout');

      const almacenada = [...repositorio.sesiones.values()][0];
      expect(almacenada.motivoRevocacion).toBe('logout');
      expect(almacenada.revocadaEn).toBeInstanceOf(Date);
    });

    it('falla de forma segura cuando el almacén no está disponible', async () => {
      const emitida = await servicio.crear(ADMINISTRADOR_ID);
      repositorio.errorEnUpdate = new Error('conexión rechazada');

      await expect(
        servicio.revocar(emitida.contexto, 'logout'),
      ).rejects.toBeInstanceOf(AlmacenSesionesNoDisponibleError);
    });
  });

  it('no expone el identificador de sesión en los registros del servidor', async () => {
    const emitir = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const emitida = await servicio.crear(ADMINISTRADOR_ID);

    await servicio.validar(emitida.token);

    expect(emitir).not.toHaveBeenCalled();
  });
});
