import { DEMO_SHOWCASE } from '@/lib/demo';
import { validarImagenes } from '@/schemas/imagen';
import { validarCampana, type CampanaFormulario } from '@/schemas/campana';
import {
  enviarArchivo,
  enviarJson,
  pedirJson,
  soloFecha,
} from '@/services/admin/cliente-admin';
import {
  createCampanaDemo,
  getCampanaDemo,
  listCampanasDemo,
  subirFotosCampanaDemo,
  updateCampanaDemo,
} from '@/services/admin/demo/campanas.demo';
import type { CampanaConTotales, CampanaEntrada, EstadoCampana } from '@/types/admin';

type ApiCampanaAdmin = {
  id: string;
  tituloEs: string;
  descripcionEs: string | null;
  lugar: string | null;
  fecha: string | null;
  estado: string;
  perrosMachos: number;
  perrosHembras: number;
  gatosMachos: number;
  gatosHembras: number;
  totales: CampanaConTotales['totales'];
  fotos: string[];
};

type ApiFotoCampana = { id: string; url: string };

function desdeApi(campana: ApiCampanaAdmin): CampanaConTotales {
  return {
    id: campana.id,
    titulo: campana.tituloEs,
    lugar: campana.lugar,
    fecha: soloFecha(campana.fecha),
    descripcion: campana.descripcionEs,
    fotos: campana.fotos,
    estado: campana.estado as EstadoCampana,
    perrosMachos: campana.perrosMachos,
    perrosHembras: campana.perrosHembras,
    gatosMachos: campana.gatosMachos,
    gatosHembras: campana.gatosHembras,
    totales: campana.totales,
    editable: campana.estado !== 'cerrada',
  };
}

function cuerpoApi(entrada: CampanaEntrada) {
  // No se envían totales, fotos ni textos en inglés: los totales los calcula el
  // backend y las fotos se suben aparte.
  return {
    tituloEs: entrada.titulo,
    descripcionEs: entrada.descripcion,
    lugar: entrada.lugar,
    fecha: entrada.fecha,
    estado: entrada.estado,
    perrosMachos: entrada.perrosMachos,
    perrosHembras: entrada.perrosHembras,
    gatosMachos: entrada.gatosMachos,
    gatosHembras: entrada.gatosHembras,
  };
}

export async function listCampanas(): Promise<CampanaConTotales[]> {
  if (DEMO_SHOWCASE) return listCampanasDemo();
  const lista = await pedirJson<ApiCampanaAdmin[]>('/admin/campanas');
  return lista.map(desdeApi);
}

export async function getCampana(id: string): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return getCampanaDemo(id);
  return desdeApi(await pedirJson<ApiCampanaAdmin>(`/admin/campanas/${id}`));
}

export async function createCampana(entrada: CampanaEntrada): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return createCampanaDemo(entrada);
  const creada = await enviarJson<ApiCampanaAdmin>('POST', '/admin/campanas', cuerpoApi(entrada));
  return desdeApi(creada);
}

export async function updateCampana(
  id: string,
  entrada: CampanaEntrada,
): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return updateCampanaDemo(id, entrada);
  const actualizada = await enviarJson<ApiCampanaAdmin>(
    'PUT',
    `/admin/campanas/${id}`,
    cuerpoApi(entrada),
  );
  return desdeApi(actualizada);
}

/** Sube las fotos una por una (JPG, PNG o WebP, 5 MB) después de guardar la campaña. */
export async function subirFotosCampana(id: string, archivos: File[]): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return subirFotosCampanaDemo(id, archivos);
  const error = validarImagenes(archivos);
  if (error) throw new Error(error);

  const nuevas: string[] = [];
  for (const archivo of archivos) {
    const foto = await enviarArchivo<ApiFotoCampana>(`/admin/campanas/${id}/fotos`, archivo);
    nuevas.push(foto.url);
  }

  const campana = await getCampana(id);
  const fotos = [...campana.fotos, ...nuevas.filter((url) => !campana.fotos.includes(url))];
  return { ...campana, fotos };
}

export async function guardarCampana(
  formulario: CampanaFormulario,
  id?: string,
  fotosConservadas: readonly string[] = [],
): Promise<CampanaConTotales> {
  const resultado = validarCampana(formulario);
  if (!resultado.ok) {
    throw new Error(Object.values(resultado.errores)[0] ?? 'Datos inválidos');
  }
  const entrada: CampanaEntrada = { ...resultado.datos, fotos: [...fotosConservadas] };
  return id ? updateCampana(id, entrada) : createCampana(entrada);
}
