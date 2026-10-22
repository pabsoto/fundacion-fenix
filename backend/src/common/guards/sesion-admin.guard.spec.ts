import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { vi } from 'vitest';
import type { AutorizacionAdministradorService } from '../../modules/administradores/services/autorizacion-administrador.service.js';
import type { CookieSesionService } from '../../modules/auth/services/cookie-sesion.service.js';
import {
  AlmacenSesionesNoDisponibleError,
  SesionDesconocidaError,
  SesionExpiradaError,
  SesionRevocadaError,
  type ContextoSesion,
} from '../../modules/auth/services/sesion-admin.service.js';
import { SesionAdminGuard } from './sesion-admin.guard.js';

const ADMINISTRADOR_ID = '11111111-1111-1111-1111-111111111111';

const CONTEXTO: ContextoSesion = {
  id: '22222222-2222-2222-2222-222222222222',
  administradorId: ADMINISTRADOR_ID,
  csrfToken: 'token-csrf-de-prueba',
  creadaEn: new Date('2026-01-01T00:00:00.000Z'),
  tokenEmitidoEn: new Date('2026-01-01T00:00:00.000Z'),
  ultimaActividadEn: new Date('2026-01-01T00:00:00.000Z'),
  expiraEn: new Date('2030-01-01T00:00:00.000Z'),
};

describe('SesionAdminGuard', () => {
  let sesiones: {
    validar: ReturnType<typeof vi.fn>;
    rotar: ReturnType<typeof vi.fn>;
  };
  let cookies: { leerToken: ReturnType<typeof vi.fn> };
  let autorizacion: { cargarParaSesion: ReturnType<typeof vi.fn> };
  let guard: SesionAdminGuard;
  let request: Record<string, unknown>;
  let response: Record<string, unknown>;

  beforeEach(() => {
    sesiones = {
      validar: vi.fn().mockResolvedValue({
        contexto: CONTEXTO,
        requiereRotacion: false,
      }),
      rotar: vi.fn().mockResolvedValue('token-rotado'),
    };
    cookies = {
      leerToken: vi.fn().mockReturnValue('token-de-sesion'),
      establecer: vi.fn(),
    };
    autorizacion = {
      cargarParaSesion: vi.fn().mockResolvedValue({
        estado: 'activo',
        administrador: {
          id: ADMINISTRADOR_ID,
          nombre: 'Administración FÉNIX',
          email: 'administrador@fundacionfenix.org',
          googleSub: 'sub-1',
          vinculado: true,
        },
      }),
    };

    guard = new SesionAdminGuard(
      sesiones as never,
      cookies as unknown as CookieSesionService,
      autorizacion as unknown as AutorizacionAdministradorService,
    );

    request = {};
    response = {};
  });

  function contexto(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  it('admite la petición y expone el administrador autenticado', async () => {
    await expect(guard.canActivate(contexto())).resolves.toBe(true);

    expect(request.sesionAdmin).toEqual(CONTEXTO);
    expect(request.administradorSesion).toEqual({
      id: ADMINISTRADOR_ID,
      nombre: 'Administración FÉNIX',
    });
  });

  it('responde 401 cuando no hay cookie de sesión', async () => {
    cookies.leerToken.mockReturnValue(undefined);

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sesiones.validar).not.toHaveBeenCalled();
  });

  it.each([
    ['desconocida', SesionDesconocidaError],
    ['expirada', SesionExpiradaError],
    ['revocada', SesionRevocadaError],
  ])('responde 401 ante una sesión %s', async (_caso, error) => {
    sesiones.validar.mockRejectedValue(new error());

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 503 cuando el almacén de sesiones no está disponible', async () => {
    sesiones.validar.mockRejectedValue(
      new AlmacenSesionesNoDisponibleError(new Error('conexión rechazada')),
    );

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('responde 403 cuando la cuenta administrativa está desactivada', async () => {
    autorizacion.cargarParaSesion.mockResolvedValue({ estado: 'inactivo' });

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('responde 401 cuando la cuenta administrativa ya no existe', async () => {
    autorizacion.cargarParaSesion.mockResolvedValue({ estado: 'inexistente' });

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('responde 503 cuando no se puede comprobar la cuenta administrativa', async () => {
    autorizacion.cargarParaSesion.mockRejectedValue(
      new Error('conexión rechazada'),
    );

    await expect(guard.canActivate(contexto())).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('renueva el identificador cuando la sesión lo requiere', async () => {
    sesiones.validar.mockResolvedValue({
      contexto: CONTEXTO,
      requiereRotacion: true,
    });

    await expect(guard.canActivate(contexto())).resolves.toBe(true);

    expect(sesiones.rotar).toHaveBeenCalledWith(CONTEXTO);
  });

  it('no deniega el acceso si la renovación del identificador falla', async () => {
    sesiones.validar.mockResolvedValue({
      contexto: CONTEXTO,
      requiereRotacion: true,
    });
    sesiones.rotar.mockRejectedValue(new Error('conexión rechazada'));

    await expect(guard.canActivate(contexto())).resolves.toBe(true);
  });
});
