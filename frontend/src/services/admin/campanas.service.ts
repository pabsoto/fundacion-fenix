import { validarCampana, type CampanaFormulario } from '@/schemas/campana';
import { CAMPANAS_EJEMPLO } from '@/services/admin/datos-ejemplo';
import { esperarMock, NoEncontradoError } from '@/services/admin/latencia';
import { totalesDe, type Campana, type CampanaConTotales, type CampanaEntrada } from '@/types/admin';

const campanas: Campana[] = structuredClone(CAMPANAS_EJEMPLO);

function presentar(campana: Campana): CampanaConTotales {
  return { ...structuredClone(campana), totales: totalesDe(campana) };
}

// TODO(backend): GET /api/admin/campanas
export async function listCampanas(): Promise<CampanaConTotales[]> {
  await esperarMock();
  return [...campanas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map(presentar);
}

// TODO(backend): GET /api/admin/campanas/:id
export async function getCampana(id: string): Promise<CampanaConTotales> {
  await esperarMock();
  const campana = campanas.find((item) => item.id === id);
  if (!campana) throw new NoEncontradoError();
  return presentar(campana);
}

// TODO(backend): POST /api/admin/campanas y POST /api/admin/campanas/:id/fotos
export async function createCampana(entrada: CampanaEntrada): Promise<CampanaConTotales> {
  await esperarMock();
  const campana: Campana = { ...structuredClone(entrada), id: crypto.randomUUID() };
  campanas.unshift(campana);
  return presentar(campana);
}

// TODO(backend): PUT /api/admin/campanas/:id
export async function updateCampana(
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

export async function guardarCampana(
  formulario: CampanaFormulario,
  id?: string,
): Promise<CampanaConTotales> {
  const resultado = validarCampana(formulario);
  if (!resultado.ok) {
    throw new Error(Object.values(resultado.errores)[0] ?? 'Datos inválidos');
  }
  return id ? updateCampana(id, resultado.datos) : createCampana(resultado.datos);
}
