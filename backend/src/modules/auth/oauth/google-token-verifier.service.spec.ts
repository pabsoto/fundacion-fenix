import { ConfigService } from '@nestjs/config';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWK,
  type JWTVerifyGetKey,
} from 'jose';
import { VerificadorIdTokenGoogleService } from './google-token-verifier.service.js';

const CLIENT_ID = '1234567890.apps.googleusercontent.com';
const NONCE_ESPERADO = 'nonce-de-prueba-1234567890';

describe('VerificadorIdTokenGoogleService', () => {
  let clavePublica: JWK;
  let clavePrivada: CryptoKey;
  let claveAjenaPrivada: CryptoKey;
  let resolver: JWTVerifyGetKey;

  beforeAll(async () => {
    const par = await generateKeyPair('RS256', { extractable: true });
    clavePublica = await exportJWK(par.publicKey);
    clavePrivada = par.privateKey;

    const ajena = await generateKeyPair('RS256', { extractable: true });
    claveAjenaPrivada = ajena.privateKey;

    resolver = createLocalJWKSet({
      keys: [
        { ...clavePublica, kid: 'llave-prueba', alg: 'RS256', use: 'sig' },
      ],
    });
  });

  function crearServicio(): VerificadorIdTokenGoogleService {
    const valores: Record<string, string | undefined> = {
      GOOGLE_CLIENT_ID: CLIENT_ID,
    };
    const config = {
      get: (clave: string) => valores[clave],
    } as unknown as ConfigService;

    return new VerificadorIdTokenGoogleService(config, {
      obtenerResolver: () => resolver,
    });
  }

  async function firmarToken(
    claims: Record<string, unknown>,
    opciones: { clave?: CryptoKey; kid?: string } = {},
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: opciones.kid ?? 'llave-prueba' })
      .sign(opciones.clave ?? clavePrivada);
  }

  function claimsBase(
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const ahora = Math.floor(Date.now() / 1_000);
    return {
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      sub: '123456789012345678901',
      iat: ahora,
      exp: ahora + 3_600,
      nonce: NONCE_ESPERADO,
      email: 'administrador@fundacionfenix.org',
      email_verified: true,
      azp: CLIENT_ID,
      ...extra,
    };
  }

  it('acepta un ID token válido y devuelve la identidad verificada', async () => {
    const token = await firmarToken(claimsBase());

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).resolves.toMatchObject({
      sub: '123456789012345678901',
      email: 'administrador@fundacionfenix.org',
      emailVerified: true,
    });
  });

  it('rechaza un ID token expirado', async () => {
    const ahora = Math.floor(Date.now() / 1_000);
    const token = await firmarToken(
      claimsBase({ exp: ahora - 120, iat: ahora - 3_600 }),
    );

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_expirado' });
  });

  it('rechaza un ID token con firma inválida', async () => {
    const token = await firmarToken(claimsBase(), { clave: claveAjenaPrivada });

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_firma_invalida' });
  });

  it('rechaza un ID token con firma manipulada', async () => {
    const token = await firmarToken(claimsBase());
    const partes = token.split('.');
    const payload = JSON.parse(
      Buffer.from(partes[1], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    payload.email = 'atacante@ejemplo.invalid';
    partes[1] = Buffer.from(JSON.stringify(payload), 'utf8').toString(
      'base64url',
    );

    await expect(
      crearServicio().verificar(partes.join('.'), { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_firma_invalida' });
  });

  it('rechaza un ID token con audiencia incorrecta', async () => {
    const token = await firmarToken(
      claimsBase({ aud: 'otra-aplicacion.apps.googleusercontent.com' }),
    );

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_audiencia_invalida' });
  });

  it('rechaza un ID token con emisor incorrecto', async () => {
    const token = await firmarToken(
      claimsBase({ iss: 'https://ejemplo.invalid' }),
    );

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_emitente_invalido' });
  });

  it('rechaza un ID token con nonce incorrecto', async () => {
    const token = await firmarToken(claimsBase({ nonce: 'otro-nonce' }));

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_nonce_invalido' });
  });

  it('rechaza un ID token sin nonce', async () => {
    const claims = claimsBase();
    delete claims.nonce;
    const token = await firmarToken(claims);

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_claims_invalidos' });
  });

  it('rechaza un ID token sin sub', async () => {
    const claims = claimsBase();
    delete claims.sub;
    const token = await firmarToken(claims);

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_claims_invalidos' });
  });

  it('rechaza un ID token con correo no verificado', async () => {
    const token = await firmarToken(claimsBase({ email_verified: false }));

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'correo_no_verificado' });
  });

  it('rechaza un ID token sin email_verified', async () => {
    const claims = claimsBase();
    delete claims.email_verified;
    const token = await firmarToken(claims);

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_claims_invalidos' });
  });

  it('rechaza un ID token emitido para otra aplicación cliente (azp)', async () => {
    const token = await firmarToken(claimsBase({ azp: 'otra-aplicacion' }));

    await expect(
      crearServicio().verificar(token, { nonce: NONCE_ESPERADO }),
    ).rejects.toMatchObject({ codigo: 'token_audiencia_invalida' });
  });
});
