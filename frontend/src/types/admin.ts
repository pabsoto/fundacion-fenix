/** Especie y sexo viven aquí porque pueden cambiar al integrar el backend. */
export const ESPECIES = ['perro', 'gato'] as const;
export const SEXOS = ['macho', 'hembra'] as const;
export const UNIDADES_EDAD = ['años', 'meses'] as const;

export type Especie = (typeof ESPECIES)[number];
export type Sexo = (typeof SEXOS)[number];
export type UnidadEdad = (typeof UNIDADES_EDAD)[number];

export type Edad = {
  valor: number;
  unidad: UnidadEdad;
};

/**
 * "Adoptado" no se guarda: se deduce de que `adoptadoPor` tenga valor.
 * `direccionAdoptante` y `fotoAdopcion` son datos personales del panel.
 */
export type Animal = {
  id: string;
  nombre: string;
  especie: Especie;
  sexo: Sexo | null;
  edad: Edad | null;
  fechaIngreso: string | null;
  fotoIngreso: string | null;
  adoptadoPor: string | null;
  direccionAdoptante: string | null;
  fotoAdopcion: string | null;
  /** Solo lectura en la UI. Al registrar la adopción se envía la fecha de hoy. */
  fechaAdopcion: string | null;
};

export type AnimalEntrada = Omit<Animal, 'id'>;

export type ContadoresCampana = {
  perrosMachos: number;
  perrosHembras: number;
  gatosMachos: number;
  gatosHembras: number;
};

/** Los totales se calculan. No se envían ni se editan. */
export type TotalesCampana = {
  perros: number;
  gatos: number;
  machos: number;
  hembras: number;
  total: number;
};

export type EstadoCampana = 'borrador' | 'publicada' | 'cerrada';
/** Lo que el formulario puede elegir. «Cerrada» solo la fija el backend. */
export type EstadoEditableCampana = Exclude<EstadoCampana, 'cerrada'>;

export type Campana = {
  id: string;
  titulo: string;
  lugar: string | null;
  /** Null cuando la jornada aún no tiene fecha. El filtro solo la muestra en «Todos». */
  fecha: string | null;
  descripcion: string | null;
  fotos: string[];
  estado: EstadoCampana;
} & ContadoresCampana;

export type CampanaEntrada = Omit<Campana, 'id' | 'estado'> & {
  estado: EstadoEditableCampana;
};

export type CampanaConTotales = Campana & {
  /** Identificador de cada foto, en el mismo orden que `fotos`. Sirve para quitarlas. */
  fotoIds: string[];
  totales: TotalesCampana;
  /** False cuando el backend marca la campaña como cerrada. */
  editable: boolean;
};

/** Filas por página en las tablas del panel. Debe coincidir con el límite por defecto del API. */
export const TAMANO_PAGINA_ADMIN = 10;

/** Página que devuelve el API: la paginación y los filtros se resuelven en el backend. */
export type Pagina<T> = {
  items: T[];
  /** Total de registros del filtro, no solo de la página. */
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
};

export type PaginaCampanas = Pagina<CampanaConTotales> & {
  /** Suma de todas las campañas del filtro (alimenta la fila acumulada). */
  contadores: ContadoresCampana;
  totales: TotalesCampana;
  /** Años con campañas, del más reciente al más antiguo. */
  anios: number[];
  /** Meses (1-12) con campañas en el año filtrado, o en cualquier año. */
  meses: number[];
};

export type ConsultaCampanas = {
  pagina?: number;
  limite?: number;
  anio?: number;
  mes?: number;
};

export type ConsultaAnimales = {
  filtro?: FiltroAnimales;
  pagina?: number;
  limite?: number;
};

export type PuntoMensual = {
  anio: number;
  mes: number;
  ingresos: number;
  adopciones: number;
};

export type AnimalEnEspera = {
  id: string;
  nombre: string;
  especie: Especie;
  dias: number;
};

export type Resumen = {
  esterilizaciones: { total: number; jornadas: number };
  enLaFundacion: { cantidad: number; registrados: number };
  adopcionesDelAnio: { cantidad: number; anio: number };
  /** Null cuando ningún animal tiene ingreso y adopción: la UI muestra "—". */
  diasHastaAdoptar: number | null;
  serie: PuntoMensual[];
  espera: AnimalEnEspera[];
};

export type FiltroAnimales = 'todos' | 'adoptados' | 'en-la-fundacion';

export function estaAdoptado(animal: Pick<Animal, 'adoptadoPor'>): boolean {
  return Boolean(animal.adoptadoPor && animal.adoptadoPor.trim());
}

export function totalesDe(contadores: ContadoresCampana): TotalesCampana {
  const perros = contadores.perrosMachos + contadores.perrosHembras;
  const gatos = contadores.gatosMachos + contadores.gatosHembras;
  return {
    perros,
    gatos,
    machos: contadores.perrosMachos + contadores.gatosMachos,
    hembras: contadores.perrosHembras + contadores.gatosHembras,
    total: perros + gatos,
  };
}
