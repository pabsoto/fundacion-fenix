import { validarAnimal, type AnimalFormulario } from '@/schemas/animal';
import { ANIMALES_EJEMPLO } from '@/services/admin/datos-ejemplo';
import { esperarMock, NoEncontradoError } from '@/services/admin/latencia';
import {
  estaAdoptado,
  type Animal,
  type AnimalEntrada,
  type FiltroAnimales,
} from '@/types/admin';

const animales: Animal[] = structuredClone(ANIMALES_EJEMPLO);

function copiar(animal: Animal): Animal {
  return structuredClone(animal);
}

// TODO(backend): GET /api/admin/animales?adoptado=
export async function listAnimales(filtro: FiltroAnimales = 'todos'): Promise<Animal[]> {
  await esperarMock();
  return animales
    .filter((animal) => {
      if (filtro === 'adoptados') return estaAdoptado(animal);
      if (filtro === 'en-la-fundacion') return !estaAdoptado(animal);
      return true;
    })
    .map(copiar);
}

// TODO(backend): GET /api/admin/animales/:id
export async function getAnimal(id: string): Promise<Animal> {
  await esperarMock();
  const animal = animales.find((item) => item.id === id);
  if (!animal) throw new NoEncontradoError();
  return copiar(animal);
}

// TODO(backend): POST /api/admin/animales y POST /api/admin/animales/:id/fotos/:tipo
export async function createAnimal(entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const animal: Animal = { ...structuredClone(entrada), id: crypto.randomUUID() };
  animales.unshift(animal);
  return copiar(animal);
}

// TODO(backend): el API aún no tiene actualización de un animal.
export async function updateAnimal(id: string, entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const indice = animales.findIndex((item) => item.id === id);
  if (indice < 0) throw new NoEncontradoError();
  const animal: Animal = { ...structuredClone(entrada), id };
  animales[indice] = animal;
  return copiar(animal);
}

// TODO(backend): el API aún no tiene borrado de un animal.
export async function deleteAnimal(id: string): Promise<void> {
  await esperarMock();
  const indice = animales.findIndex((item) => item.id === id);
  if (indice < 0) throw new NoEncontradoError();
  animales.splice(indice, 1);
}

export async function guardarAnimal(
  formulario: AnimalFormulario,
  id?: string,
): Promise<Animal> {
  const resultado = validarAnimal(formulario);
  if (!resultado.ok) {
    throw new Error(Object.values(resultado.errores)[0] ?? 'Datos inválidos');
  }
  return id ? updateAnimal(id, resultado.datos) : createAnimal(resultado.datos);
}
