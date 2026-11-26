import { exportacionAdmin, type FormatoExportacion } from '@/config/exportacion-admin';
import { descargarBlob } from '@/services/admin/cliente-admin';

export type FiltrosExportarCampanas = {
  anio: number | null;
  mes: number | null;
  /** Texto del campo, aunque el listado todavía no se haya refrescado. */
  q: string;
};

export type FiltrosExportarAnimales = {
  adoptado: boolean | null;
  q: string;
};

function consultaComun(formato: FormatoExportacion, q: string): Record<string, string | undefined> {
  const { parametros } = exportacionAdmin;
  const texto = q.trim();
  return {
    [parametros.formato]: formato,
    [parametros.q]: texto || undefined,
  };
}

export function descargarCampanas(
  formato: FormatoExportacion,
  filtros: FiltrosExportarCampanas,
  nombreArchivo: string,
): Promise<void> {
  const { parametros, campanas } = exportacionAdmin;
  return descargarBlob(
    campanas,
    {
      ...consultaComun(formato, filtros.q),
      [parametros.anio]: filtros.anio === null ? undefined : String(filtros.anio),
      [parametros.mes]: filtros.mes === null ? undefined : String(filtros.mes),
    },
    nombreArchivo,
  );
}

export function descargarAnimales(
  formato: FormatoExportacion,
  filtros: FiltrosExportarAnimales,
  nombreArchivo: string,
): Promise<void> {
  const { parametros, animales } = exportacionAdmin;
  return descargarBlob(
    animales,
    {
      ...consultaComun(formato, filtros.q),
      [parametros.adoptado]:
        filtros.adoptado === null ? undefined : filtros.adoptado ? 'true' : 'false',
    },
    nombreArchivo,
  );
}
