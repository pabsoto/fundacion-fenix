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
  private readonly client: SupabaseClient | undefined;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET');

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
  ): Promise<void> {
    const bucket = this.obtenerBucket();
    const { error } = await bucket.upload(ruta, contenido, {
      cacheControl: '31536000',
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

  async eliminar(ruta: string): Promise<void> {
    const bucket = this.obtenerBucket();
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

  private obtenerBucket() {
    if (!this.client || !this.bucket) {
      throw new StorageNoConfiguradoError(
        'Supabase Storage no está configurado en el servidor',
      );
    }

    return this.client.storage.from(this.bucket);
  }
}
