import { DEMO_SHOWCASE } from '@/lib/demo';
import { validarImagen } from '@/schemas/imagen';
import { validarAnimal, type AnimalFormulario } from '@/schemas/animal';
import {
  borrar,
  enviarArchivo,
  enviarJson,
  pedirJson,
  soloFecha,
} from '@/services/admin/cliente-admin';
import {
  createAnimalDemo,
  deleteAnimalDemo,
  getAnimalDemo,
  listAnimalesDemo,
  quitarFotoAnimalDemo,
  subirFotoAnimalDemo,
  updateAnimalDemo,
} from '@/services/admin/demo/animales.demo';
import {
  estaAdoptado,
  TAMANO_PAGINA_ADMIN,
  type Animal,
  type AnimalEntrada,
  type ConsultaAnimales,
  type Especie,
  type Pagina,
  type Sexo,
} from '@/types/admin';

export type TipoFotoAnimal = 'animal' | 'entrega';

type ApiAnimal = {
  id: string;
  nombre: string;
  especie: string;
  sexo: string | null;
  edad: number | null;
  edadUnidad: string | null;
  fechaIngreso: string | null;
  adoptado: boolean;
  nombreAdoptante: string | null;
  direccionAdoptante: string | null;
  fechaAdopcion: string | null;
  tieneFotoAnimal: boolean;
  tieneFotoEntrega: boolean;
};

type ApiFotoAnimal = { url: string };

type OpcionesLista = {
  /** El resumen no usa fotos: con `false` se evitan las consultas de fotos. */
  conFotos?: boolean;
};

function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** La foto es protegida: se pide con la sesión y llega como URL firmada temporal. */
async function urlFoto(id: string, tipo: TipoFotoAnimal): Promise<string | null> {
  try {
    const foto = await pedirJson<ApiFotoAnimal>(`/admin/animales/${id}/fotos/${tipo}`);
    return foto.url;
  } catch {
    // Si la URL firmada no se pudo obtener, el animal se muestra sin esa foto.
    return null;
  }
}

async function desdeApi(animal: ApiAnimal, conFotos: boolean): Promise<Animal> {
  // Solo se piden las fotos que existen: el API indica cuáles.
  const [fotoIngreso, fotoAdopcion] = await Promise.all([
    conFotos && animal.tieneFotoAnimal ? urlFoto(animal.id, 'animal') : null,
    conFotos && animal.tieneFotoEntrega ? urlFoto(animal.id, 'entrega') : null,
  ]);

  return {
    id: animal.id,
    nombre: animal.nombre,
    especie: animal.especie as Especie,
    sexo: animal.sexo as Sexo | null,
    edad:
      animal.edad === null
        ? null
        : { valor: animal.edad, unidad: animal.edadUnidad === 'meses' ? 'meses' : 'años' },
    fechaIngreso: soloFecha(animal.fechaIngreso),
    fotoIngreso,
    adoptadoPor: animal.adoptado ? animal.nombreAdoptante : null,
    direccionAdoptante: animal.direccionAdoptante,
    fotoAdopcion,
    fechaAdopcion: soloFecha(animal.fechaAdopcion),
  };
}

function cuerpoApi(entrada: AnimalEntrada) {
  const adoptado = estaAdoptado(entrada);
  return {
    nombre: entrada.nombre,
    especie: entrada.especie,
    sexo: entrada.sexo,
    edad: entrada.edad ? entrada.edad.valor : null,
    edadUnidad: entrada.edad ? (entrada.edad.unidad === 'meses' ? 'meses' : 'anios') : null,
    fechaIngreso: entrada.fechaIngreso,
    adoptado,
    // Si falta la dirección, el API rechaza la adopción.
    ...(adoptado
      ? {
          nombreAdoptante: entrada.adoptadoPor,
          direccionAdoptante: entrada.direccionAdoptante,
          fechaAdopcion: entrada.fechaAdopcion,
        }
      : {}),
  };
}

/**
 * Una página de animales. El backend filtra por estado de adopción y pagina;
 * las fotos solo se piden de los animales de la página.
 */
export async function listAnimales(
  { filtro = 'todos', pagina = 1, limite = TAMANO_PAGINA_ADMIN }: ConsultaAnimales = {},
  { conFotos = true }: OpcionesLista = {},
): Promise<Pagina<Animal>> {
  if (DEMO_SHOWCASE) return listAnimalesDemo({ filtro, pagina, limite });
  const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
  if (filtro === 'adoptados') parametros.set('adoptado', 'true');
  if (filtro === 'en-la-fundacion') parametros.set('adoptado', 'false');
  const respuesta = await pedirJson<Pagina<ApiAnimal>>(`/admin/animales?${parametros.toString()}`);
  return {
    ...respuesta,
    items: await Promise.all(respuesta.items.map((animal) => desdeApi(animal, conFotos))),
  };
}

export async function getAnimal(id: string): Promise<Animal> {
  if (DEMO_SHOWCASE) return getAnimalDemo(id);
  return desdeApi(await pedirJson<ApiAnimal>(`/admin/animales/${id}`), true);
}

/** Las fotos van después, por `subirFotoAnimal`. */
export async function createAnimal(entrada: AnimalEntrada): Promise<Animal> {
  if (DEMO_SHOWCASE) return createAnimalDemo(entrada);
  const creado = await enviarJson<ApiAnimal>('POST', '/admin/animales', cuerpoApi(entrada));
  return desdeApi(creado, false);
}

/** Reemplaza los datos del animal. Conserva sus fotos. */
export async function updateAnimal(id: string, entrada: AnimalEntrada): Promise<Animal> {
  if (DEMO_SHOWCASE) return updateAnimalDemo(id, entrada);
  const actualizado = await enviarJson<ApiAnimal>('PUT', `/admin/animales/${id}`, cuerpoApi(entrada));
  return desdeApi(actualizado, true);
}

/** Borrado lógico: el animal deja de aparecer, pero el registro se conserva. */
export async function deleteAnimal(id: string): Promise<void> {
  if (DEMO_SHOWCASE) return deleteAnimalDemo(id);
  await borrar(`/admin/animales/${id}`);
}

/** JPG, PNG o WebP, 5 MB. La de tipo `entrega` exige un animal adoptado. */
export async function subirFotoAnimal(
  id: string,
  tipo: TipoFotoAnimal,
  archivo: File,
): Promise<Animal> {
  if (DEMO_SHOWCASE) return subirFotoAnimalDemo(id, tipo, archivo);
  const error = validarImagen(archivo);
  if (error) throw new Error(error);
  await enviarArchivo(`/admin/animales/${id}/fotos/${tipo}`, archivo);
  return getAnimal(id);
}

/** Quita la foto del animal (`animal`) o la de su adopción (`entrega`). */
export async function quitarFotoAnimal(id: string, tipo: TipoFotoAnimal): Promise<Animal> {
  if (DEMO_SHOWCASE) return quitarFotoAnimalDemo(id, tipo);
  await borrar(`/admin/animales/${id}/fotos/${tipo}`);
  return getAnimal(id);
}

export async function guardarAnimal(
  formulario: AnimalFormulario,
  id?: string,
): Promise<Animal> {
  const resultado = validarAnimal(formulario);
  if (!resultado.ok) {
    throw new Error(Object.values(resultado.errores)[0] ?? 'Datos inválidos');
  }

  const previo = id ? await getAnimal(id) : undefined;
  const adoptado = Boolean(resultado.datos.adoptadoPor);
  const entrada: AnimalEntrada = {
    ...resultado.datos,
    fotoIngreso: previo?.fotoIngreso ?? null,
    fotoAdopcion: adoptado ? (previo?.fotoAdopcion ?? null) : null,
    fechaAdopcion: adoptado ? (previo?.fechaAdopcion ?? fechaHoy()) : null,
  };
  return id ? updateAnimal(id, entrada) : createAnimal(entrada);
}
