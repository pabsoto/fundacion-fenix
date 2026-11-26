import { fechaLegible, type ColumnaPdf } from '../../common/utils/pdf.js';
import type { CampanaAdminDto } from './dto/campana-admin.dto.js';
import type { ConsultaCampanasDto } from './dto/consulta-campanas.dto.js';

const ESTADOS: Record<string, string> = {
  borrador: 'Borrador',
  publicada: 'Publicada',
  cerrada: 'Cerrada',
};

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Los datos del CSV, con los contadores agrupados por especie. */
export const COLUMNAS_PDF_CAMPANAS: readonly ColumnaPdf<CampanaAdminDto>[] = [
  {
    encabezado: 'Título',
    ancho: 26,
    valor: (c) => [c.tituloEs, c.tituloEn].filter(Boolean).join('\n'),
  },
  { encabezado: 'Lugar', ancho: 20, valor: (c) => c.lugar },
  { encabezado: 'Fecha', ancho: 10, valor: (c) => fechaLegible(c.fecha) },
  {
    encabezado: 'Estado',
    ancho: 10,
    valor: (c) => ESTADOS[c.estado] ?? c.estado,
  },
  {
    encabezado: 'Perros (M / H)',
    ancho: 10,
    alineacion: 'right',
    valor: (c) => `${c.perrosMachos} / ${c.perrosHembras}`,
  },
  {
    encabezado: 'Gatos (M / H)',
    ancho: 10,
    alineacion: 'right',
    valor: (c) => `${c.gatosMachos} / ${c.gatosHembras}`,
  },
  {
    encabezado: 'Total',
    ancho: 7,
    alineacion: 'right',
    valor: (c) => c.totales.total,
  },
  { encabezado: 'Histórica', ancho: 8, valor: (c) => c.esHistorico },
];

/** Filtros activos redactados para el encabezado del PDF. */
export function describirFiltrosCampanas({
  anio,
  mes,
  q,
}: ConsultaCampanasDto): string[] {
  const filtros: string[] = [];
  if (anio !== undefined) filtros.push(`Año: ${anio}`);
  if (mes !== undefined) filtros.push(`Mes: ${MESES[mes - 1]}`);
  if (q) filtros.push(`Búsqueda: «${q}»`);
  return filtros;
}
