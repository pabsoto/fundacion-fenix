import { fechaLegible, type ColumnaPdf } from '../../common/utils/pdf.js';
import type { AnimalDto } from './dto/animal.dto.js';
import type { ConsultaAnimalesDto } from './dto/consulta-animales.dto.js';

const ETIQUETAS: Record<string, string> = {
  perro: 'Perro',
  gato: 'Gato',
  macho: 'Macho',
  hembra: 'Hembra',
};

const etiqueta = (valor: string | null) =>
  valor === null ? null : (ETIQUETAS[valor] ?? valor);

function edadLegible({ edad, edadUnidad }: AnimalDto): string | null {
  if (edad === null) return null;
  if (edadUnidad === 'meses') return `${edad} ${edad === 1 ? 'mes' : 'meses'}`;
  return `${edad} ${edad === 1 ? 'año' : 'años'}`;
}

/** Los datos del CSV, con la edad y el adoptante agrupados. */
export const COLUMNAS_PDF_ANIMALES: readonly ColumnaPdf<AnimalDto>[] = [
  { encabezado: 'Nombre', ancho: 18, valor: (a) => a.nombre },
  { encabezado: 'Especie', ancho: 9, valor: (a) => etiqueta(a.especie) },
  { encabezado: 'Sexo', ancho: 9, valor: (a) => etiqueta(a.sexo) },
  { encabezado: 'Edad', ancho: 9, valor: edadLegible },
  {
    encabezado: 'Ingreso',
    ancho: 10,
    valor: (a) => fechaLegible(a.fechaIngreso),
  },
  { encabezado: 'Adoptado', ancho: 8, valor: (a) => a.adoptado },
  {
    encabezado: 'Adoptante y dirección',
    ancho: 27,
    valor: (a) =>
      [a.nombreAdoptante, a.direccionAdoptante].filter(Boolean).join('\n'),
  },
  {
    encabezado: 'Adopción',
    ancho: 10,
    valor: (a) => fechaLegible(a.fechaAdopcion),
  },
];

/** Filtros activos redactados como en el panel, para el encabezado del PDF. */
export function describirFiltrosAnimales({
  adoptado,
  q,
}: ConsultaAnimalesDto): string[] {
  const filtros: string[] = [];
  if (adoptado !== undefined) {
    filtros.push(`Estado: ${adoptado ? 'Adoptados' : 'En la fundación'}`);
  }
  if (q) filtros.push(`Búsqueda: «${q}»`);
  return filtros;
}
