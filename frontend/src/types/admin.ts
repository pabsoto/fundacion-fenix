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

export type Campana = {
  id: string;
  titulo: string;
  lugar: string | null;
  fecha: string;
  descripcion: string | null;
  fotos: string[];
} & ContadoresCampana;

export type CampanaEntrada = Omit<Campana, 'id'>;

export type CampanaConTotales = Campana & {
  totales: TotalesCampana;
  /** False cuando el backend marca la campaña como cerrada. */
  editable: boolean;
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
  diasHastaAdoptar: number;
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
