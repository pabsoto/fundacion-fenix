import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';

const dobles = vi.hoisted(() => ({
  construir: vi.fn(),
  canjear: vi.fn(),
  descubrir: vi.fn(),
}));

vi.mock('openid-client', () => ({
  discovery: (...argumentos: unknown[]) => dobles.descubrir(...argumentos),
  buildAuthorizationUrl: (...argumentos: unknown[]) =>
    dobles.construir(...argumentos),
  authorizationCodeGrant: (...argumentos: unknown[]) =>
    dobles.canjear(...argumentos),
  ClientSecretPost: (secreto: string) => ({
    metodo: 'client_secret_post',
    secreto,
  }),
  AuthorizationResponseError: class AuthorizationResponseError extends Error {},
  ResponseBodyError: class ResponseBodyError extends Error {},
}));

const { ClienteOAuthGoogleService } =
  await import('./google-oauth-client.service.js');

const CALLBACK_URL = 'https://api.fundacionfenix.org/api/auth/google/callback';

describe('ClienteOAuthGoogleService', () => {
  let valores: Record<string, string | undefined>;

  function crearServicio(): InstanceType<typeof ClienteOAuthGoogleService> {
    const config = {
      get: (clave: string) => valores[clave],
    } as unknown as ConfigService;

    return new ClienteOAuthGoogleService(config);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    valores = {
      GOOGLE_CLIENT_ID: 'cliente.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'secreto',
      GOOGLE_CALLBACK_URL: CALLBACK_URL,
      GOOGLE_OAUTH_ISSUER: 'https://accounts.google.com',
    };
    dobles.descubrir.mockResolvedValue({ configuracion: 'ficticia' });
    dobles.construir.mockReturnValue(
      new URL('https://accounts.google.com/auth'),
    );
    dobles.canjear.mockResolvedValue({ id_token: 'id-token-ficticio' });
  });

  it('solicita únicamente los permisos openid, email y profile con PKCE', async () => {
    await crearServicio().construirUrlAutorizacion({
      state: 'state-de-prueba',
      nonce: 'nonce-de-prueba',
      codeChallenge: 'desafio-de-prueba',
      redirectUri: CALLBACK_URL,
    });

    const [, parametros] = dobles.construir.mock.calls[0] as [
      unknown,
      Record<string, string>,
    ];

    expect(parametros).toMatchObject({
      redirect_uri: CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state: 'state-de-prueba',
      nonce: 'nonce-de-prueba',
      code_challenge: 'desafio-de-prueba',
      code_challenge_method: 'S256',
    });
    expect(parametros).not.toHaveProperty('access_type');
    expect(parametros.scope).not.toContain('gmail');
    expect(parametros.scope).not.toContain('drive');
    expect(parametros.scope).not.toContain('calendar');
  });

  it('canjea el código con el state y el verificador PKCE', async () => {
    const resultado = await crearServicio().canjearCodigo({
      code: 'codigo-de-autorizacion',
      codeVerifier: 'verificador-pkce',
      state: 'state-de-prueba',
      issuer: 'https://accounts.google.com',
      nonce: 'nonce-de-prueba',
      redirectUri: CALLBACK_URL,
    });

    expect(resultado).toEqual({ idToken: 'id-token-ficticio' });

    const [, url, comprobaciones] = dobles.canjear.mock.calls[0] as [
      unknown,
      URL,
      Record<string, string>,
    ];

    expect(url.searchParams.get('code')).toBe('codigo-de-autorizacion');
    expect(url.searchParams.get('state')).toBe('state-de-prueba');
    expect(url.searchParams.get('iss')).toBe('https://accounts.google.com');
    expect(url.origin + url.pathname).toBe(CALLBACK_URL);
    expect(comprobaciones).toEqual({
      expectedState: 'state-de-prueba',
      expectedNonce: 'nonce-de-prueba',
      pkceCodeVerifier: 'verificador-pkce',
    });
  });

  it('traduce un error de autorización de Google', async () => {
    const { AuthorizationResponseError } = await import('openid-client');
    dobles.canjear.mockRejectedValue(
      new AuthorizationResponseError('access_denied', 'El usuario canceló'),
    );

    await expect(
      crearServicio().canjearCodigo({
        code: 'codigo',
        codeVerifier: 'verificador',
        state: 'state',
        nonce: 'nonce',
        redirectUri: CALLBACK_URL,
      }),
    ).rejects.toMatchObject({ codigo: 'error_proveedor' });
  });

  it('informa que el proveedor no está disponible cuando falla el descubrimiento', async () => {
    dobles.descubrir.mockRejectedValue(new Error('sin red'));

    await expect(
      crearServicio().construirUrlAutorizacion({
        state: 'state',
        nonce: 'nonce',
        codeChallenge: 'desafio',
        redirectUri: CALLBACK_URL,
      }),
    ).rejects.toMatchObject({ codigo: 'proveedor_no_disponible' });
  });

  it('falla cuando la configuración de Google no está disponible', async () => {
    valores.GOOGLE_CLIENT_ID = undefined;

    await expect(
      crearServicio().construirUrlAutorizacion({
        state: 'state',
        nonce: 'nonce',
        codeChallenge: 'desafio',
        redirectUri: CALLBACK_URL,
      }),
    ).rejects.toMatchObject({ codigo: 'configuracion_invalida' });
  });

  it('rechaza una respuesta sin ID token', async () => {
    dobles.canjear.mockResolvedValue({});

    await expect(
      crearServicio().canjearCodigo({
        code: 'codigo',
        codeVerifier: 'verificador',
        state: 'state',
        nonce: 'nonce',
        redirectUri: CALLBACK_URL,
      }),
    ).rejects.toMatchObject({ codigo: 'token_claims_invalidos' });
  });
});
