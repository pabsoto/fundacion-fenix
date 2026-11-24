import type { ColumnaCsv } from '../../common/utils/csv.js';
import type { AnimalDto } from './dto/animal.dto.js';

/** Columnas del CSV de animales: las mismas que muestra la lista. */
export const COLUMNAS_CSV_ANIMALES: readonly ColumnaCsv<AnimalDto>[] = [
  { encabezado: 'Nombre', valor: (a) => a.nombre },
  { encabezado: 'Especie', valor: (a) => a.especie },
  { encabezado: 'Sexo', valor: (a) => a.sexo },
  { encabezado: 'Edad', valor: (a) => a.edad },
  { encabezado: 'Unidad de edad', valor: (a) => a.edadUnidad },
  { encabezado: 'Fecha de ingreso', valor: (a) => a.fechaIngreso },
  { encabezado: 'Adoptado', valor: (a) => a.adoptado },
  { encabezado: 'Adoptante', valor: (a) => a.nombreAdoptante },
  { encabezado: 'Dirección del adoptante', valor: (a) => a.direccionAdoptante },
  { encabezado: 'Fecha de adopción', valor: (a) => a.fechaAdopcion },
];
