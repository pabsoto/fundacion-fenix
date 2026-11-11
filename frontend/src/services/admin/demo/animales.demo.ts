// DEMO: implementación simulada de animales. Se usa solo con VITE_DEMO_SHOWCASE=true.
// Para quitar la simulación, borrar la carpeta `services/admin/demo/`.
import { validarImagen } from '@/schemas/imagen';
import { ANIMALES_EJEMPLO } from '@/services/admin/demo/datos-ejemplo';
import { esperarMock, NoEncontradoError } from '@/services/admin/demo/latencia';
import {
  estaAdoptado,
  TAMANO_PAGINA_ADMIN,
  type Animal,
  type AnimalEntrada,
  type ConsultaAnimales,
  type Pagina,
} from '@/types/admin';

const animales: Animal[] = structuredClone(ANIMALES_EJEMPLO);

export type TipoFotoAnimalDemo = 'animal' | 'entrega';

function copiar(animal: Animal): Animal {
  return structuredClone(animal);
}

function exigir(id: string): { indice: number; animal: Animal } {
  const indice = animales.findIndex((item) => item.id === id);
  const animal = indice < 0 ? undefined : animales[indice];
  if (!animal) throw new NoEncontradoError();
  return { indice, animal };
}

function filtrados({ filtro = 'todos' }: ConsultaAnimales): Animal[] {
  return animales.filter((animal) => {
    if (filtro === 'adoptados') return estaAdoptado(animal);
    if (filtro === 'en-la-fundacion') return !estaAdoptado(animal);
    return true;
  });
}

/** Misma respuesta que el API: filtra y pagina. */
export async function listAnimalesDemo(consulta: ConsultaAnimales = {}): Promise<Pagina<Animal>> {
  await esperarMock();
  const lista = filtrados(consulta);
  const pagina = consulta.pagina ?? 1;
  const limite = consulta.limite ?? TAMANO_PAGINA_ADMIN;
  const desde = (pagina - 1) * limite;
  return {
    items: lista.slice(desde, desde + limite).map(copiar),
    total: lista.length,
    pagina,
    limite,
    totalPaginas: Math.max(1, Math.ceil(lista.length / limite)),
  };
}

/** Todos los animales, sin paginar. Solo para armar el resumen de la demo. */
export async function listTodosAnimalesDemo(): Promise<Animal[]> {
  await esperarMock();
  return animales.map(copiar);
}

export async function getAnimalDemo(id: string): Promise<Animal> {
  await esperarMock();
  return copiar(exigir(id).animal);
}

export async function createAnimalDemo(entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const animal: Animal = { ...structuredClone(entrada), id: crypto.randomUUID() };
  animales.unshift(animal);
  return copiar(animal);
}

export async function updateAnimalDemo(id: string, entrada: AnimalEntrada): Promise<Animal> {
  await esperarMock();
  const { indice } = exigir(id);
  const animal: Animal = { ...structuredClone(entrada), id };
  animales[indice] = animal;
  return copiar(animal);
}

export async function deleteAnimalDemo(id: string): Promise<void> {
  await esperarMock();
  const { indice } = exigir(id);
  animales.splice(indice, 1);
}

export async function subirFotoAnimalDemo(
  id: string,
  tipo: TipoFotoAnimalDemo,
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

export async function quitarFotoAnimalDemo(
  id: string,
  tipo: TipoFotoAnimalDemo,
): Promise<Animal> {
  await esperarMock();
  const { indice, animal } = exigir(id);
  const actualizado: Animal =
    tipo === 'animal' ? { ...animal, fotoIngreso: null } : { ...animal, fotoAdopcion: null };
  animales[indice] = actualizado;
  return copiar(actualizado);
}
