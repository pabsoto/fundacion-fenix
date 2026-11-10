import { validarImagen } from '@/schemas/imagen';
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

export type TipoFotoAnimal = 'animal' | 'entrega';

function copiar(animal: Animal): Animal {
  return structuredClone(animal);
}

function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function exigir(id: string): { indice: number; animal: Animal } {
  const indice = animales.findIndex((item) => item.id === id);
  const animal = indice < 0 ? undefined : animales[indice];
  if (!animal) throw new NoEncontradoError();
  return { indice, animal };
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
  return copiar(exigir(id).animal);
}

// TODO(backend): POST /api/admin/animales. Las fotos van después, por subirFotoAnimal.
export async function createAnimal(entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const animal: Animal = { ...structuredClone(entrada), id: crypto.randomUUID() };
  animales.unshift(animal);
  return copiar(animal);
}

// TODO(backend): el API aún no tiene actualización de un animal.
export async function updateAnimal(id: string, entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const { indice } = exigir(id);
  const animal: Animal = { ...structuredClone(entrada), id };
  animales[indice] = animal;
  return copiar(animal);
}

// TODO(backend): el API aún no tiene borrado de un animal.
export async function deleteAnimal(id: string): Promise<void> {
  await esperarMock();
  const { indice } = exigir(id);
  animales.splice(indice, 1);
}

// TODO(backend): POST /api/admin/animales/:id/fotos/:tipo (animal | entrega, JPG/PNG/WebP, 5 MB).
export async function subirFotoAnimal(
  id: string,
  tipo: TipoFotoAnimal,
  archivo: File,
): Promise<Animal> {
  await esperarMock();
  const error = validarImagen(archivo);
  if (error) throw new Error(error);
  const { indice, animal } = exigir(id);
  if (tipo === 'entrega' && !estaAdoptado(animal)) {
    throw new Error('La foto de la adopción exige un animal adoptado');
  }
  const url = URL.createObjectURL(archivo);
  const actualizado: Animal =
    tipo === 'animal' ? { ...animal, fotoIngreso: url } : { ...animal, fotoAdopcion: url };
  animales[indice] = actualizado;
  return copiar(actualizado);
}

// TODO(backend): el API aún no tiene quitar foto.
export async function quitarFotoAnimal(id: string, tipo: TipoFotoAnimal): Promise<Animal> {
  await esperarMock();
  const { indice, animal } = exigir(id);
  const actualizado: Animal =
    tipo === 'animal' ? { ...animal, fotoIngreso: null } : { ...animal, fotoAdopcion: null };
  animales[indice] = actualizado;
  return copiar(actualizado);
}

export async function guardarAnimal(
  formulario: AnimalFormulario,
  id?: string,
): Promise<Animal> {
  const resultado = validarAnimal(formulario);
  if (!resultado.ok) {
    throw new Error(Object.values(resultado.errores)[0] ?? 'Datos inválidos');
  }

  const previo = id ? exigir(id).animal : undefined;
  const adoptado = Boolean(resultado.datos.adoptadoPor);
  // TODO(backend): enviar nombre, especie, sexo, edad (0–40), edadUnidad "anios"|"meses",
  // fechaIngreso, adoptado, nombreAdoptante, direccionAdoptante y fechaAdopcion.
  // No enviar fotos en el JSON. Si falta la dirección, el API real rechaza la adopción.
  const entrada: AnimalEntrada = {
    ...resultado.datos,
    fotoIngreso: previo?.fotoIngreso ?? null,
    fotoAdopcion: adoptado ? (previo?.fotoAdopcion ?? null) : null,
    fechaAdopcion: adoptado ? (previo?.fechaAdopcion ?? fechaHoy()) : null,
  };
  return id ? updateAnimal(id, entrada) : createAnimal(entrada);
}
