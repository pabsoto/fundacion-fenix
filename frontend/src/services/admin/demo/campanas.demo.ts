// DEMO: implementación simulada de campañas. Se usa solo con VITE_DEMO_SHOWCASE=true.
// Para quitar la simulación, borrar la carpeta `services/admin/demo/`.
import { validarImagenes } from '@/schemas/imagen';
import { CAMPANAS_EJEMPLO } from '@/services/admin/demo/datos-ejemplo';
import { esperarMock, NoEncontradoError } from '@/services/admin/demo/latencia';
import { totalesDe, type Campana, type CampanaConTotales, type CampanaEntrada } from '@/types/admin';

const campanas: Campana[] = structuredClone(CAMPANAS_EJEMPLO);

function porFechaDesc(a: Campana, b: Campana): number {
  if (a.fecha === b.fecha) return 0;
  if (!a.fecha) return 1;
  if (!b.fecha) return -1;
  return b.fecha.localeCompare(a.fecha);
}

function presentar(campana: Campana): CampanaConTotales {
  return {
    ...structuredClone(campana),
    totales: totalesDe(campana),
    editable: campana.estado !== 'cerrada',
  };
}

export async function listCampanasDemo(): Promise<CampanaConTotales[]> {
  await esperarMock();
  return [...campanas].sort(porFechaDesc).map(presentar);
}

export async function getCampanaDemo(id: string): Promise<CampanaConTotales> {
  await esperarMock();
  const campana = campanas.find((item) => item.id === id);
  if (!campana) throw new NoEncontradoError();
  return presentar(campana);
}

export async function createCampanaDemo(entrada: CampanaEntrada): Promise<CampanaConTotales> {
  await esperarMock();
  const campana: Campana = { ...structuredClone(entrada), id: crypto.randomUUID() };
  campanas.unshift(campana);
  return presentar(campana);
}

export async function updateCampanaDemo(
  id: string,
  entrada: CampanaEntrada,
): Promise<CampanaConTotales> {
  await esperarMock();
  const indice = campanas.findIndex((item) => item.id === id);
  if (indice < 0) throw new NoEncontradoError();
  const campana: Campana = { ...structuredClone(entrada), id };
  campanas[indice] = campana;
  return presentar(campana);
}

export async function subirFotosCampanaDemo(
  id: string,
  archivos: File[],
): Promise<CampanaConTotales> {
  await esperarMock();
  const error = validarImagenes(archivos);
  if (error) throw new Error(error);
  const indice = campanas.findIndex((item) => item.id === id);
  if (indice < 0) throw new NoEncontradoError();
  const actual = campanas[indice];
  if (!actual) throw new NoEncontradoError();
  const urls = archivos.map((archivo) => URL.createObjectURL(archivo));
  const campana: Campana = { ...actual, fotos: [...actual.fotos, ...urls] };
  campanas[indice] = campana;
  return presentar(campana);
}

export async function cerrarCampanaDemo(id: string): Promise<CampanaConTotales> {
  await esperarMock();
  const indice = campanas.findIndex((item) => item.id === id);
  const actual = indice < 0 ? undefined : campanas[indice];
  if (!actual) throw new NoEncontradoError();
  if (actual.estado !== 'publicada') {
    throw new Error('Solo se puede cerrar una campaña publicada');
  }
  if (totalesDe(actual).total <= 0) {
    throw new Error('Registra al menos una esterilización antes de cerrar la campaña');
  }
  campanas[indice] = { ...actual, estado: 'cerrada' };
  return presentar(campanas[indice]);
}

export async function reabrirCampanaDemo(id: string): Promise<CampanaConTotales> {
  await esperarMock();
  const indice = campanas.findIndex((item) => item.id === id);
  const actual = indice < 0 ? undefined : campanas[indice];
  if (!actual) throw new NoEncontradoError();
  if (actual.estado !== 'cerrada') throw new Error('La campaña no está cerrada');
  campanas[indice] = { ...actual, estado: 'publicada' };
  return presentar(campanas[indice]);
}
