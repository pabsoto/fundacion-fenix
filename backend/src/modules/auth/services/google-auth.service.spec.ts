import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import type { AutorizacionAdministradorService } from '../../administradores/services/autorizacion-administrador.service.js';
import type { ClienteOAuthGoogleService } from '../oauth/google-oauth-client.service.js';
import type { VerificadorIdTokenGoogleService } from '../oauth/google-token-verifier.service.js';
import {
  AlmacenTransaccionesOAuth,
  ErrorDemasiadasTransacciones,
} from '../oauth/oauth-transaction.store.js';
import { GoogleAuthService } from './google-auth.service.js';

const CALLBACK_URL = 'https://api.fundacionfenix.org/api/auth/google/callback';
const RUTA_CALLBACK = '/api/auth/google/callback';

describe('GoogleAuthService', () => {
  let almacen: AlmacenTransaccionesOAuth;
  let cliente: {
    construirUrlAutorizacion: ReturnType<typeof vi.fn>;
    canjearCodigo: ReturnType<typeof vi.fn>;
  };
  let verificador: { verificar: ReturnType<typeof vi.fn> };
  let autorizacion: { autorizar: ReturnType<typeof vi.fn> };
  let valores: Record<string, string | undefined>;

  function crearServicio(): GoogleAuthService {
    const config = {
      get: (clave: string) => valores[clave],
    } as unknown as ConfigService;

    return new GoogleAuthService(
      config,
      cliente as unknown as ClienteOAuthGoogleService,
      verificador as unknown as VerificadorIdTokenGoogleService,
      almacen,
      autorizacion as unknown as AutorizacionAdministradorService,
    );
  }

  beforeEach(() => {
    almacen = new AlmacenTransaccionesOAuth();
    valores = {
      GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
      GOOGLE_CALLBACK_URL: CALLBACK_URL,
      GOOGLE_OAUTH_TRANSACTION_TTL_SECONDS: '600',
    };
    cliente = {
      construirUrlAutorizacion: vi
        .fn()
        .mockImplementation(
          async (params: {
            state: string;
            nonce: string;
            codeChallenge: string;
          }) =>
            new URL(
              `https://accounts.google.com/o/oauth2/v2/auth?state=${params.state}&nonce=${params.nonce}&code_challenge=${params.codeChallenge}`,
            ),
        ),
      canjearCodigo: vi
        .fn()
        .mockResolvedValue({ idToken: 'id-token-ficticio' }),
    };
    verificador = {
      verificar: vi.fn().mockResolvedValue({
        sub: 'sub-1',
        email: 'administrador@fundacionfenix.org',
        emailVerified: true,
      }),
    };
    autorizacion = {
      autorizar: vi.fn().mockResolvedValue({
        estado: 'autorizado',
        administrador: {
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Administración FÉNIX',
          email: 'administrador@fundacionfenix.org',
          googleSub: 'sub-1',
          vinculado: true,
        },
      }),
    };
  });

  async function iniciarYObtenerState(): Promise<{
    state: string;
    nonce: string;
  }> {
    await crearServicio().iniciar();
    const argumentos = cliente.construirUrlAutorizacion.mock.calls[0][0] as {
      state: string;
      nonce: string;
    };

    return argumentos;
  }

  describe('inicio', () => {
    it('registra la transacción y devuelve la URL de autorización', async () => {
      const inicio = await crearServicio().iniciar();

      expect(inicio.url.origin).toBe('https://accounts.google.com');
      expect(almacen.total).toBe(1);

      const argumentos = cliente.construirUrlAutorizacion.mock.calls[0][0] as {
        state: string;
        nonce: string;
        codeChallenge: string;
        redirectUri: string;
      };

      expect(argumentos.state).toHaveLength(43);
      expect(argumentos.nonce).toHaveLength(43);
      expect(argumentos.codeChallenge).toHaveLength(43);
      expect(argumentos.redirectUri).toBe(CALLBACK_URL);
      expect(inicio.ttlSegundos).toBe(600);
    });

    it('falla cuando la configuración de Google no está disponible', async () => {
      valores.GOOGLE_CALLBACK_URL = undefined;

      await expect(crearServicio().iniciar()).rejects.toMatchObject({
        codigo: 'configuracion_invalida',
      });
    });

    it('limita el número de transacciones de autenticación pendientes', async () => {
      vi.spyOn(almacen, 'registrar').mockImplementation(() => {
        throw new ErrorDemasiadasTransacciones();
      });

      await expect(crearServicio().iniciar()).rejects.toMatchObject({
        codigo: 'demasiadas_solicitudes',
      });
    });
  });

  describe('callback', () => {
    it('autoriza al administrador y deja la sesión para la capa HTTP', async () => {
      const { state } = await iniciarYObtenerState();

      const resultado = await crearServicio().completar({
        code: 'codigo-de-autorizacion',
        state,
        vinculacionNavegador: vinculacionDe(state),
        rutaRecibida: RUTA_CALLBACK,
      });

      expect(resultado).toEqual({
        estado: 'autorizado',
        mensaje: expect.any(String),
        sesion: { creada: false },
        administrador: {
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Administración FÉNIX',
        },
      });
      expect(resultado.administrador).not.toHaveProperty('email');
      expect(cliente.canjearCodigo).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'codigo-de-autorizacion', state }),
      );
    });

    it('rechaza un state desconocido', async () => {
      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state: 'state-inventado',
          vinculacionNavegador: 'cualquiera',
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'state_invalido' });
    });

    it('rechaza un state ausente', async () => {
      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          vinculacionNavegador: 'cualquiera',
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'state_invalido' });
    });

    it('rechaza la reutilización de una respuesta ya canjeada', async () => {
      const { state } = await iniciarYObtenerState();
      const vinculacion = vinculacionDe(state);
      const servicio = crearServicio();

      await servicio.completar({
        code: 'codigo-de-autorizacion',
        state,
        vinculacionNavegador: vinculacion,
        rutaRecibida: RUTA_CALLBACK,
      });

      await expect(
        servicio.completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: vinculacion,
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'state_invalido' });
    });

    it('rechaza una transacción caducada', async () => {
      const { state } = await iniciarYObtenerState();
      almacen.purgarExpiradas();

      vi.useFakeTimers();
      vi.setSystemTime(new Date(Date.now() + 15 * 60 * 1_000));

      try {
        await expect(
          crearServicio().completar({
            code: 'codigo-de-autorizacion',
            state,
            vinculacionNavegador: vinculacionDe(state),
            rutaRecibida: RUTA_CALLBACK,
          }),
        ).rejects.toMatchObject({ codigo: 'transaccion_expirada' });
      } finally {
        vi.useRealTimers();
      }
    });

    it('rechaza la respuesta si el navegador no es el que inició el flujo', async () => {
      const { state } = await iniciarYObtenerState();

      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: 'valor-de-otro-navegador',
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'vinculacion_navegador_invalida' });
    });

    it('rechaza una respuesta recibida en una ruta distinta a la configurada', async () => {
      const { state } = await iniciarYObtenerState();

      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: vinculacionDe(state),
          rutaRecibida: '/otra/ruta',
        }),
      ).rejects.toMatchObject({ codigo: 'state_invalido' });
    });

    it('rechaza un error o cancelación de Google', async () => {
      await expect(
        crearServicio().completar({
          error: 'access_denied',
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'error_proveedor' });
    });

    it('rechaza una cuenta que no está registrada', async () => {
      const { state } = await iniciarYObtenerState();
      autorizacion.autorizar.mockResolvedValue({
        estado: 'no_autorizado',
        motivo: 'inexistente',
      });

      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: vinculacionDe(state),
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'autorizacion_denegada' });
    });

    it('exige la vinculación inicial cuando google_sub está vacío', async () => {
      const { state } = await iniciarYObtenerState();
      autorizacion.autorizar.mockResolvedValue({
        estado: 'vinculacion_pendiente',
        administrador: {
          id: '11111111-1111-1111-1111-111111111111',
          nombre: 'Administración FÉNIX',
          email: 'administrador@fundacionfenix.org',
          googleSub: null,
          vinculado: false,
        },
      });

      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: vinculacionDe(state),
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'vinculacion_pendiente' });
    });

    it('propaga el error cuando el ID token no es válido', async () => {
      const { state } = await iniciarYObtenerState();
      verificador.verificar.mockRejectedValue(
        Object.assign(new Error('token inválido'), {
          codigo: 'token_firma_invalida',
        }),
      );

      await expect(
        crearServicio().completar({
          code: 'codigo-de-autorizacion',
          state,
          vinculacionNavegador: vinculacionDe(state),
          rutaRecibida: RUTA_CALLBACK,
        }),
      ).rejects.toMatchObject({ codigo: 'token_firma_invalida' });
    });
  });

  function vinculacionDe(state: string): string {
    const transaccion = almacen.obtener(state);
    if (!transaccion) {
      throw new Error('Transacción no encontrada');
    }

    return transaccion.vinculacionNavegador;
  }
});
