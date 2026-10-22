import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CsrfGuard } from './csrf.guard.js';

const TOKEN_CSRF = 'token-csrf-de-prueba';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let request: Record<string, unknown>;

  beforeEach(() => {
    const config = {
      get: (clave: string) =>
        clave === 'CORS_ALLOWED_ORIGINS' ? 'http://localhost:5173' : undefined,
    } as unknown as ConfigService;

    guard = new CsrfGuard(config);

    request = {
      method: 'POST',
      headers: {},
      sesionAdmin: {
        id: '22222222-2222-2222-2222-222222222222',
        administradorId: '11111111-1111-1111-1111-111111111111',
        csrfToken: TOKEN_CSRF,
        creadaEn: new Date(),
        tokenEmitidoEn: new Date(),
        ultimaActividadEn: new Date(),
        expiraEn: new Date(),
      },
    };
  });

  function contexto(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  it('permite las operaciones de sólo lectura', () => {
    request.method = 'GET';

    expect(guard.canActivate(contexto())).toBe(true);
  });

  it('admite una operación de escritura con el token correcto', () => {
    request.headers = { 'x-csrf-token': TOKEN_CSRF };

    expect(guard.canActivate(contexto())).toBe(true);
  });

  it('rechaza una operación de escritura sin token', () => {
    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });

  it('rechaza un token anti-CSRF incorrecto', () => {
    request.headers = { 'x-csrf-token': 'token-inventado' };

    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });

  it('rechaza una operación de escritura sin sesión resuelta', () => {
    delete request.sesionAdmin;
    request.headers = { 'x-csrf-token': TOKEN_CSRF };

    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });

  it('rechaza una operación de escritura desde un origen no autorizado', () => {
    request.headers = {
      'x-csrf-token': TOKEN_CSRF,
      origin: 'https://sitio-no-autorizado.example',
    };

    expect(() => guard.canActivate(contexto())).toThrow(ForbiddenException);
  });

  it('admite una operación de escritura desde un origen autorizado', () => {
    request.headers = {
      'x-csrf-token': TOKEN_CSRF,
      origin: 'http://localhost:5173',
    };

    expect(guard.canActivate(contexto())).toBe(true);
  });
});
