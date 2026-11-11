import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAnimal,
  deleteAnimal,
  listAnimales,
  quitarFotoAnimal,
  updateAnimal,
} from '@/services/admin/animales.service';
import {
  cerrarCampana,
  createCampana,
  listCampanas,
  quitarFotoCampana,
  reabrirCampana,
  subirFotosCampana,
} from '@/services/admin/campanas.service';
import { fijarCsrfAdmin } from '@/services/admin/cliente-admin';
import { getResumen } from '@/services/admin/resumen.service';
import type { AnimalEntrada, CampanaEntrada } from '@/types/admin';

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: false }));

const fetchMock = vi.fn();

function respuesta(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fijarCsrfAdmin('token-csrf');
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

const apiCampana = {
  id: 'c1',
  tituloEs: 'Jornada Sur',
  descripcionEs: null,
  lugar: 'Zona Sur',
  fecha: '2026-03-10',
  estado: 'cerrada',
  perrosMachos: 1,
  perrosHembras: 2,
  gatosMachos: 3,
  gatosHembras: 4,
  totales: { perros: 3, gatos: 7, machos: 4, hembras: 6, total: 10 },
  fotos: [{ id: 'f1', url: 'https://fotos/1.webp', orden: 1 }],
};

describe('campanas con la API real', () => {
  it('lista con cookie, toma las fotos del API admin y marca las cerradas como no editables', async () => {
    fetchMock.mockResolvedValue(respuesta([apiCampana]));

    const [campana] = await listCampanas();

    expect(campana).toMatchObject({
      id: 'c1',
      titulo: 'Jornada Sur',
      estado: 'cerrada',
      editable: false,
      fotos: ['https://fotos/1.webp'],
      fotoIds: ['f1'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('include');
  });

  it('muestra un borrador como editable y con su estado', async () => {
    fetchMock.mockResolvedValue(respuesta([{ ...apiCampana, estado: 'borrador', fotos: [] }]));

    const [campana] = await listCampanas();

    expect(campana).toMatchObject({ estado: 'borrador', editable: true, fotos: [] });
  });

  it('crea enviando tituloEs, el CSRF y sin fotos ni totales', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiCampana, estado: 'publicada' }, 201));
    const entrada: CampanaEntrada = {
      titulo: 'Jornada Sur',
      lugar: 'Zona Sur',
      fecha: '2026-03-10',
      descripcion: null,
      estado: 'publicada',
      perrosMachos: 1,
      perrosHembras: 2,
      gatosMachos: 3,
      gatosHembras: 4,
      fotos: ['no-se-envia.png'],
    };

    await createCampana(entrada);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/campanas$/);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('token-csrf');
    const cuerpo = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(cuerpo).toMatchObject({ tituloEs: 'Jornada Sur', estado: 'publicada' });
    expect(cuerpo).not.toHaveProperty('fotos');
    expect(cuerpo).not.toHaveProperty('totales');
  });

  it('guarda como borrador cuando el formulario lo pide', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiCampana, estado: 'borrador', fotos: [] }, 201));

    await createCampana({
      titulo: 'Pendiente',
      lugar: null,
      fecha: null,
      descripcion: null,
      estado: 'borrador',
      perrosMachos: 0,
      perrosHembras: 0,
      gatosMachos: 0,
      gatosHembras: 0,
      fotos: [],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      tituloEs: 'Pendiente',
      estado: 'borrador',
      lugar: null,
      fecha: null,
    });
  });

  it('sube cada foto en el campo archivo', async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return respuesta({ id: 'f1', url: 'https://fotos/nueva.webp' }, 201);
      return url.endsWith('/admin/campanas/c1') ? respuesta(apiCampana) : respuesta([]);
    });
    const archivo = new File(['x'], 'foto.png', { type: 'image/png' });

    const campana = await subirFotosCampana('c1', [archivo]);

    const subida = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'POST',
    ) as [string, RequestInit];
    expect(subida[0]).toMatch(/\/admin\/campanas\/c1\/fotos$/);
    expect((subida[1].body as FormData).get('archivo')).toBeInstanceOf(File);
    expect(campana.fotos).toContain('https://fotos/nueva.webp');
  });
});

describe('animales con la API real', () => {
  const apiAnimal = {
    id: 'a1',
    nombre: 'Max',
    especie: 'perro',
    sexo: 'macho',
    edad: 3,
    edadUnidad: 'anios',
    fechaIngreso: '2026-01-05T00:00:00.000Z',
    adoptado: false,
    nombreAdoptante: null,
    direccionAdoptante: null,
    fechaAdopcion: null,
    tieneFotoAnimal: false,
    tieneFotoEntrega: false,
  };

  it('filtra con ?adoptado=, traduce edad y fechas y no pide fotos que no existen', async () => {
    fetchMock.mockResolvedValue(respuesta([apiAnimal]));

    const [animal] = await listAnimales('en-la-fundacion');

    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/admin/animales?adoptado=false');
    expect(animal).toMatchObject({
      nombre: 'Max',
      edad: { valor: 3, unidad: 'años' },
      fechaIngreso: '2026-01-05',
      adoptadoPor: null,
      fotoIngreso: null,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('pide solo la foto que el animal tiene', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/fotos/animal')
        ? respuesta({ animalId: 'a1', url: 'https://fotos/max.webp', expiraEnSegundos: 300 })
        : respuesta([{ ...apiAnimal, tieneFotoAnimal: true }]),
    );

    const [animal] = await listAnimales();

    expect(animal?.fotoIngreso).toBe('https://fotos/max.webp');
    const urls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('/fotos/entrega'))).toBe(false);
  });

  it('registra una adopción con nombreAdoptante y edadUnidad "anios"', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiAnimal, adoptado: true }, 201));
    const entrada: AnimalEntrada = {
      nombre: 'Max',
      especie: 'perro',
      sexo: 'macho',
      edad: { valor: 3, unidad: 'años' },
      fechaIngreso: '2026-01-05',
      fotoIngreso: null,
      adoptadoPor: 'Ana Pérez',
      direccionAdoptante: 'Av. Siempre Viva 1',
      fotoAdopcion: null,
      fechaAdopcion: '2026-02-01',
    };

    await createAnimal(entrada);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      adoptado: true,
      nombreAdoptante: 'Ana Pérez',
      direccionAdoptante: 'Av. Siempre Viva 1',
      edad: 3,
      edadUnidad: 'anios',
    });
  });
});

describe('cierre de campañas con la API real', () => {
  it('cierra con POST, el token CSRF y devuelve la campaña cerrada', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiCampana, estado: 'cerrada' }));

    const campana = await cerrarCampana('c1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/campanas\/c1\/cerrar$/);
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('token-csrf');
    expect(campana).toMatchObject({ estado: 'cerrada', editable: false });
  });

  it('reabre con POST y deja la campaña editable', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiCampana, estado: 'publicada' }));

    const campana = await reabrirCampana('c1');

    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/admin\/campanas\/c1\/reabrir$/);
    expect(campana).toMatchObject({ estado: 'publicada', editable: true });
  });

  it('propaga el mensaje del API cuando no se puede cerrar', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ message: 'Registra al menos una esterilización antes de cerrar la campaña' }, 400),
    );

    await expect(cerrarCampana('c1')).rejects.toThrow(/al menos una esterilización/);
  });
});

describe('quitar fotos de campaña con la API real', () => {
  it('borra por id con DELETE y el token CSRF', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await quitarFotoCampana('c1', 'f1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/campanas\/c1\/fotos\/f1$/);
    expect(init.method).toBe('DELETE');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('token-csrf');
  });

  it('propaga el error cuando la campaña está cerrada', async () => {
    fetchMock.mockResolvedValue(
      respuesta({ message: 'Las fotografías de una campaña cerrada no se modifican' }, 409),
    );

    await expect(quitarFotoCampana('c1', 'f1')).rejects.toThrow(/campaña cerrada/);
  });
});

describe('editar, eliminar y quitar fotos de animales con la API real', () => {
  const apiAnimal = {
    id: 'a1',
    nombre: 'Max',
    especie: 'perro',
    sexo: 'macho',
    edad: 3,
    edadUnidad: 'anios',
    fechaIngreso: '2026-01-05',
    adoptado: false,
    nombreAdoptante: null,
    direccionAdoptante: null,
    fechaAdopcion: null,
    tieneFotoAnimal: false,
    tieneFotoEntrega: false,
  };

  const entrada: AnimalEntrada = {
    nombre: 'Max el grande',
    especie: 'perro',
    sexo: 'macho',
    edad: { valor: 4, unidad: 'meses' },
    fechaIngreso: '2026-01-05',
    fotoIngreso: null,
    adoptadoPor: null,
    direccionAdoptante: null,
    fotoAdopcion: null,
    fechaAdopcion: null,
  };

  it('actualiza con PUT, CSRF y edadUnidad "meses"', async () => {
    fetchMock.mockResolvedValue(respuesta({ ...apiAnimal, nombre: 'Max el grande' }));

    const animal = await updateAnimal('a1', entrada);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/animales\/a1$/);
    expect(init.method).toBe('PUT');
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('token-csrf');
    expect(JSON.parse(String(init.body))).toMatchObject({
      nombre: 'Max el grande',
      edad: 4,
      edadUnidad: 'meses',
      adoptado: false,
    });
    expect(animal.nombre).toBe('Max el grande');
  });

  it('elimina con DELETE', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await deleteAnimal('a1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/animales\/a1$/);
    expect(init.method).toBe('DELETE');
  });

  it('quita la foto y vuelve a leer el animal', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === 'DELETE' ? new Response(null, { status: 204 }) : respuesta(apiAnimal),
    );

    const animal = await quitarFotoAnimal('a1', 'entrega');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/animales\/a1\/fotos\/entrega$/);
    expect(init.method).toBe('DELETE');
    expect(animal.fotoAdopcion).toBeNull();
  });
});

describe('resumen con la API real', () => {
  it('lo pide al servidor en vez de calcularlo en el navegador', async () => {
    const resumen = {
      esterilizaciones: { total: 310, jornadas: 4 },
      enLaFundacion: { cantidad: 4, registrados: 8 },
      adopcionesDelAnio: { cantidad: 4, anio: 2026 },
      diasHastaAdoptar: 196,
      serie: [],
      espera: [],
    };
    fetchMock.mockResolvedValue(respuesta(resumen));

    await expect(getResumen()).resolves.toEqual(resumen);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/admin\/resumen$/);
  });
});
