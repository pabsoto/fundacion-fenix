export type Campaign = {
  id: string;
  place: string;
  city?: string;
  year: number;
  months: number[];
  /** Fecha ISO (YYYY-MM-DD). Sin fecha, la jornada queda al final y no se elige sola. */
  fecha: string | null;
  total: number;
  dogs: number;
  cats: number;
  males: number;
  females: number;
  photos: string[];
  /** Textos de la API. La landing no los renderiza. */
  tituloEs?: string | null;
  tituloEn?: string | null;
  descripcionEs?: string | null;
  descripcionEn?: string | null;
};

export type SpeciesStats = {
  total: number;
  males: number;
  females: number;
};

export type Stats = {
  caninos: SpeciesStats;
  felinos: SpeciesStats;
};

export type LocalizedText = { es: string; en: string };

export type Story = {
  id: string;
  animalName: string;
  title: LocalizedText;
  text: LocalizedText;
  /** Firma pública opcional; si falta, la tarjeta no muestra autor. */
  author?: string;
  /** Fecha de la historia (YYYY-MM-DD) que se muestra al público. */
  date: string;
  photo?: string;
  photoWidth?: number;
  photoHeight?: number;
};
