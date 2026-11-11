import { DEMO_SHOWCASE } from '@/lib/demo';
import { pedirJson } from '@/services/admin/cliente-admin';
import { listTodosAnimalesDemo } from '@/services/admin/demo/animales.demo';
import { listTodasCampanasDemo } from '@/services/admin/demo/campanas.demo';
import {
  estaAdoptado,
  type Animal,
  type ContadoresCampana,
  type PuntoMensual,
  type Resumen,
} from '@/types/admin';

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES_GRAFICA = 12;
const ESPERA_MAXIMA = 4;

function instante(iso: string): number | null {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!coincidencia) return null;
  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);
  const valor = Date.UTC(anio, mes - 1, dia);
  const fecha = new Date(valor);
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return valor;
}

function isoLocal(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function diasEntre(desdeIso: string, hastaIso: string): number | null {
  const desde = instante(desdeIso);
  const hasta = instante(hastaIso);
  if (desde === null || hasta === null) return null;
  return Math.round((hasta - desde) / DIA_MS);
}

function claveMes(iso: string): string {
  const [anio, mes] = iso.split('-');
  return `${Number(anio)}-${Number(mes)}`;
}

function serieVacia(hoy: Date): PuntoMensual[] {
  const puntos: PuntoMensual[] = [];
  const cursor = new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_GRAFICA - 1), 1);
  for (let indice = 0; indice < MESES_GRAFICA; indice += 1) {
    puntos.push({
      anio: cursor.getFullYear(),
      mes: cursor.getMonth() + 1,
      ingresos: 0,
      adopciones: 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return puntos;
}

function contarSerie(animales: Animal[], hoy: Date): PuntoMensual[] {
  const puntos = serieVacia(hoy);
  const indice = new Map(puntos.map((punto, posicion) => [`${punto.anio}-${punto.mes}`, posicion]));

  for (const animal of animales) {
    if (!animal.fechaIngreso || instante(animal.fechaIngreso) === null) continue;

    const ingreso = indice.get(claveMes(animal.fechaIngreso));
    if (ingreso !== undefined) puntos[ingreso].ingresos += 1;

    if (animal.fechaAdopcion && instante(animal.fechaAdopcion) !== null) {
      const adopcion = indice.get(claveMes(animal.fechaAdopcion));
      if (adopcion !== undefined) puntos[adopcion].adopciones += 1;
    }
  }

  return puntos;
}

/** Arma el resumen a partir de las listas. `hoy` solo cambia en pruebas. */
export function calcularResumen(
  campanas: ContadoresCampana[],
  animales: Animal[],
  hoy: Date = new Date(),
): Resumen {
  const hoyIso = isoLocal(hoy);
  const anio = hoy.getFullYear();

  const esterilizaciones = campanas.reduce(
    (total, campana) =>
      total + campana.perrosMachos + campana.perrosHembras + campana.gatosMachos + campana.gatosHembras,
    0,
  );

  const muestras: number[] = [];
  for (const animal of animales) {
    if (!animal.fechaIngreso || !animal.fechaAdopcion) continue;
    const dias = diasEntre(animal.fechaIngreso, animal.fechaAdopcion);
    if (dias === null) continue;
    muestras.push(dias);
  }

  const espera = animales
    .flatMap((animal) => {
      if (estaAdoptado(animal) || !animal.fechaIngreso) return [];
      const dias = diasEntre(animal.fechaIngreso, hoyIso);
      if (dias === null) return [];
      return [
        {
          id: animal.id,
          nombre: animal.nombre,
          especie: animal.especie,
          dias,
          fecha: animal.fechaIngreso,
        },
      ];
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.nombre.localeCompare(b.nombre, 'es'))
    .slice(0, ESPERA_MAXIMA)
    .map((animal) => ({
      id: animal.id,
      nombre: animal.nombre,
      especie: animal.especie,
      dias: animal.dias,
    }));

  return {
    esterilizaciones: { total: esterilizaciones, jornadas: campanas.length },
    enLaFundacion: {
      cantidad: animales.filter((animal) => !estaAdoptado(animal)).length,
      registrados: animales.length,
    },
    adopcionesDelAnio: {
      cantidad: animales.filter((animal) => {
        if (!animal.fechaAdopcion || instante(animal.fechaAdopcion) === null) return false;
        return animal.fechaAdopcion.startsWith(`${anio}-`);
      }).length,
      anio,
    },
    diasHastaAdoptar:
      muestras.length === 0
        ? null
        : Math.round(muestras.reduce((suma, dias) => suma + dias, 0) / muestras.length),
    serie: contarSerie(animales, hoy),
    espera,
  };
}

export async function getResumen(): Promise<Resumen> {
  if (!DEMO_SHOWCASE) return pedirJson<Resumen>('/admin/resumen');
  // DEMO: con datos simulados el resumen se arma en el navegador con las listas de ejemplo.
  const [campanas, animales] = await Promise.all([listTodasCampanasDemo(), listTodosAnimalesDemo()]);
  return calcularResumen(campanas, animales);
}
