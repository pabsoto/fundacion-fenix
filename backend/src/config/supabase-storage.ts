const CAMPOS_STORAGE = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_STORAGE_BUCKET',
] as const;

export function validateSupabaseStorageEnvironment(
  values: Record<string, unknown>,
): Record<string, string> {
  const presentes = CAMPOS_STORAGE.filter(
    (campo) => typeof values[campo] === 'string' && values[campo] !== '',
  );

  if (presentes.length === 0) return {};

  for (const campo of CAMPOS_STORAGE) {
    if (typeof values[campo] !== 'string' || values[campo].trim() === '') {
      throw new Error(
        `${campo} es obligatoria cuando se configura Supabase Storage`,
      );
    }
  }

  const supabaseUrl = (values.SUPABASE_URL as string).trim().replace(/\/$/, '');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error('SUPABASE_URL debe ser una URL absoluta válida');
  }

  if (
    parsedUrl.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
  ) {
    throw new Error('SUPABASE_URL debe utilizar el protocolo https');
  }

  const serviceRoleKey = (values.SUPABASE_SERVICE_ROLE_KEY as string).trim();
  if (serviceRoleKey.length < 20) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no tiene un formato válido');
  }

  const bucket = (values.SUPABASE_STORAGE_BUCKET as string).trim();
  if (!/^[a-z0-9][a-z0-9._-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error(
      'SUPABASE_STORAGE_BUCKET debe ser un nombre seguro de 3 a 63 caracteres',
    );
  }

  return {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
    SUPABASE_STORAGE_BUCKET: bucket,
  };
}
