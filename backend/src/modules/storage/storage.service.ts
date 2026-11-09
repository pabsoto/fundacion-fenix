import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class StorageNoConfiguradoError extends Error {}

export class StorageOperacionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
  }
}

@Injectable()
export class StorageService {
  private readonly bucket: string | undefined;
  private readonly bucketPrivado: string | undefined;
  private readonly client: SupabaseClient | undefined;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET');
    this.bucketPrivado = config.get<string>('SUPABASE_STORAGE_BUCKET_PRIVADO');

    if (url && serviceRoleKey && this.bucket) {
      this.client = createClient(url, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });
    }
  }

  async subir(
    ruta: string,
    contenido: Buffer,
    contentType: string,
    privado = false,
  ): Promise<void> {
    const bucket = this.obtenerBucket(privado);
    const { error } = await bucket.upload(ruta, contenido, {
      cacheControl: privado ? '0' : '31536000',
      contentType,
      upsert: false,
    });

    if (error) {
      throw new StorageOperacionError(
        'No fue posible subir el archivo a Supabase Storage',
        error,
      );
    }
  }

  async eliminar(ruta: string, privado = false): Promise<void> {
    const bucket = this.obtenerBucket(privado);
    const { error } = await bucket.remove([ruta]);

    if (error) {
      throw new StorageOperacionError(
        'No fue posible eliminar el archivo de Supabase Storage',
        error,
      );
    }
  }

  obtenerUrlPublica(ruta: string): string {
    const bucket = this.obtenerBucket();
    const { data } = bucket.getPublicUrl(ruta);
    return data.publicUrl;
  }

  async crearUrlFirmada(ruta: string, segundos: number): Promise<string> {
    const bucket = this.obtenerBucket(true);
    const { data, error } = await bucket.createSignedUrl(ruta, segundos);

    if (error || !data) {
      throw new StorageOperacionError(
        'No fue posible firmar el archivo de Supabase Storage',
        error,
      );
    }
    return data.signedUrl;
  }

  private obtenerBucket(privado = false) {
    const nombre = privado ? this.bucketPrivado : this.bucket;
    if (!this.client || !nombre) {
      throw new StorageNoConfiguradoError(
        'Supabase Storage no está configurado en el servidor',
      );
    }

    return this.client.storage.from(nombre);
  }
}
