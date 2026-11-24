import type { ColumnaCsv } from '../../common/utils/csv.js';
import type { CampanaAdminDto } from './dto/campana-admin.dto.js';

const ESTADOS: Record<string, string> = {
  borrador: 'Borrador',
  publicada: 'Publicada',
  cerrada: 'Cerrada',
};

/** Columnas del CSV de campañas: las mismas cifras que muestra la lista. */
export const COLUMNAS_CSV_CAMPANAS: readonly ColumnaCsv<CampanaAdminDto>[] = [
  { encabezado: 'Título', valor: (c) => c.tituloEs },
  { encabezado: 'Título (inglés)', valor: (c) => c.tituloEn },
  { encabezado: 'Lugar', valor: (c) => c.lugar },
  { encabezado: 'Fecha', valor: (c) => c.fecha },
  { encabezado: 'Estado', valor: (c) => ESTADOS[c.estado] ?? c.estado },
  { encabezado: 'Perros machos', valor: (c) => c.perrosMachos },
  { encabezado: 'Perros hembras', valor: (c) => c.perrosHembras },
  { encabezado: 'Gatos machos', valor: (c) => c.gatosMachos },
  { encabezado: 'Gatos hembras', valor: (c) => c.gatosHembras },
  { encabezado: 'Total', valor: (c) => c.totales.total },
  { encabezado: 'Histórica', valor: (c) => c.esHistorico },
];
