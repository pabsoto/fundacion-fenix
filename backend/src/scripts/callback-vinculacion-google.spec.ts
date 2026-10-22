import { describe, expect, it } from 'vitest';
import { resolverCallbackVinculacion } from './callback-vinculacion-google.js';

describe('callback de vinculación Google', () => {
  it('reutiliza el callback OAuth local ya autorizado', () => {
    const url = resolverCallbackVinculacion({
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
    });

    expect(url.toString()).toBe(
      'http://localhost:3000/api/auth/google/callback',
    );
  });

  it('permite un callback específico de CLI en loopback', () => {
    const url = resolverCallbackVinculacion({
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/auth/google/callback',
      GOOGLE_LINK_CALLBACK_URL: 'http://127.0.0.1:3005/callback',
    });

    expect(url.toString()).toBe('http://127.0.0.1:3005/callback');
  });

  it('rechaza callbacks externos', () => {
    expect(() =>
      resolverCallbackVinculacion({
        GOOGLE_LINK_CALLBACK_URL: 'https://example.com/callback',
      }),
    ).toThrow('debe utilizar HTTP sobre localhost');
  });
});
