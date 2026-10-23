import { fetchApi } from './api';

export type BilingualText = {
  es: string | null;
  en: string | null;
};

export type InstitutionalContent = {
  clave: string;
  titulo: BilingualText;
  descripcion: BilingualText;
  imagenUrl: string | null;
  orden: number;
};

export function getInstitutionalContent(): Promise<InstitutionalContent[]> {
  return fetchApi<InstitutionalContent[]>('/public/institucional');
}
