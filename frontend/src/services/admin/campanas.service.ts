import { DEMO_SHOWCASE } from '@/lib/demo';
import { validarImagenes } from '@/schemas/imagen';
import { validarCampana, type CampanaFormulario } from '@/schemas/campana';
import {
  borrar,
  enviarArchivo,
  enviarJson,
  pedirJson,
  soloFecha,
} from '@/services/admin/cliente-admin';
import {
  cerrarCampanaDemo,
  createCampanaDemo,
  deleteCampanaDemo,
  getCampanaDemo,
  listCampanasDemo,
  quitarFotoCampanaDemo,
  reabrirCampanaDemo,
  subirFotosCampanaDemo,
  updateCampanaDemo,
} from '@/services/admin/demo/campanas.demo';
import {
  TAMANO_PAGINA_ADMIN,
  type CampanaConTotales,
  type CampanaEntrada,
  type ConsultaCampanas,
  type EstadoCampana,
  type PaginaCampanas,
} from '@/types/admin';

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
  fotos: ApiFotoAdmin[];
};

type ApiPaginaCampanas = Omit<PaginaCampanas, 'items'> & { items: ApiCampanaAdmin[] };

type ApiFotoCampana = { id: string; url: string };

type ApiFotoAdmin = { id: string; url: string; orden: number };

function desdeApi(campana: ApiCampanaAdmin): CampanaConTotales {
  return {
    id: campana.id,
    titulo: campana.tituloEs,
    lugar: campana.lugar,
    fecha: soloFecha(campana.fecha),
    descripcion: campana.descripcionEs,
    fotos: campana.fotos.map((foto) => foto.url),
    fotoIds: campana.fotos.map((foto) => foto.id),
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

/**
 * Una página de campañas. El backend filtra por año y mes, pagina y suma las
 * cifras de todo el filtro (`contadores`, `totales`).
 */
export async function listCampanas(consulta: ConsultaCampanas = {}): Promise<PaginaCampanas> {
  if (DEMO_SHOWCASE) return listCampanasDemo(consulta);
  const parametros = new URLSearchParams({
    pagina: String(consulta.pagina ?? 1),
    limite: String(consulta.limite ?? TAMANO_PAGINA_ADMIN),
  });
  if (consulta.anio !== undefined) parametros.set('anio', String(consulta.anio));
  if (consulta.mes !== undefined) parametros.set('mes', String(consulta.mes));
  const pagina = await pedirJson<ApiPaginaCampanas>(`/admin/campanas?${parametros.toString()}`);
  return { ...pagina, items: pagina.items.map(desdeApi) };
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

/**
 * Cierra una campaña publicada: sus cifras pasan al contador público y deja
 * de editarse. El API exige al menos una esterilización.
 */
export async function cerrarCampana(id: string): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return cerrarCampanaDemo(id);
  return desdeApi(await enviarJson<ApiCampanaAdmin>('POST', `/admin/campanas/${id}/cerrar`, {}));
}

/**
 * Elimina una campaña con sus fotos. El API rechaza (409) las cerradas y la
 * histórica: hay que reabrirlas antes.
 */
export async function deleteCampana(id: string): Promise<void> {
  if (DEMO_SHOWCASE) return deleteCampanaDemo(id);
  await borrar(`/admin/campanas/${id}`);
}

/** Devuelve una campaña cerrada a publicada para poder corregirla. */
export async function reabrirCampana(id: string): Promise<CampanaConTotales> {
  if (DEMO_SHOWCASE) return reabrirCampanaDemo(id);
  return desdeApi(await enviarJson<ApiCampanaAdmin>('POST', `/admin/campanas/${id}/reabrir`, {}));
}

/** Quita una foto de la campaña. Con la API real `fotoId` es el id de la foto, no su URL. */
export async function quitarFotoCampana(
  id: string,
  fotoId: string,
): Promise<CampanaConTotales | void> {
  if (DEMO_SHOWCASE) return quitarFotoCampanaDemo(id, fotoId);
  await borrar(`/admin/campanas/${id}/fotos/${fotoId}`);
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
