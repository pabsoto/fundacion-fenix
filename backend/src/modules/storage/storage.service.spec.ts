import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';

const bucket = vi.hoisted(() => ({
  upload: vi.fn(),
  remove: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ storage: { from: () => bucket } }),
}));

const { StorageService, StorageOperacionError } =
  await import('./storage.service.js');

describe('StorageService', () => {
  const valores: Record<string, string> = {
    SUPABASE_URL: 'https://proyecto.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'clave-de-servicio-ficticia',
    SUPABASE_STORAGE_BUCKET: 'publico',
    SUPABASE_STORAGE_BUCKET_PRIVADO: 'privado',
  };
  const config = {
    get: (clave: string) => valores[clave],
  } as unknown as ConfigService;
  const fallo = { data: null, error: new Error('bucket no encontrado') };

  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it.each([
    [
      'subir',
      'publico',
      () => new StorageService(config).subir('a/b.png', Buffer.from('x'), 't'),
    ],
    [
      'eliminar',
      'publico',
      () => new StorageService(config).eliminar('a/b.png'),
    ],
    [
      'firmar',
      'privado',
      () => new StorageService(config).crearUrlFirmada('a/b.png', 60),
    ],
  ])('registra el fallo al %s', async (operacion, tipo, ejecutar) => {
    bucket.upload.mockResolvedValue(fallo);
    bucket.remove.mockResolvedValue(fallo);
    bucket.createSignedUrl.mockResolvedValue(fallo);

    await expect(ejecutar()).rejects.toBeInstanceOf(StorageOperacionError);

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]?.[0]).toEqual({
      evento: 'fallo_supabase_storage',
      operacion,
      bucket: tipo,
      ruta: 'a/b.png',
      detalle: 'bucket no encontrado',
    });
  });

  it('no registra nada cuando la operación tiene éxito', async () => {
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://firmada' },
      error: null,
    });

    await new StorageService(config).crearUrlFirmada('a/b.png', 60);

    expect(error).not.toHaveBeenCalled();
  });
});
