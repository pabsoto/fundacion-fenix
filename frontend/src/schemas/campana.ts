import { textosAdmin } from '@/content/textos-admin';
import type { CampanaEntrada } from '@/types/admin';
import { validarImagenes } from './imagen';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONTADOR = 100000;
const MAX_TITULO = 200;
const MAX_LUGAR = 200;
const MAX_DESCRIPCION = 5000;

export type CampanaFormulario = {
  titulo: string;
  lugar: string;
  fecha: string;
  descripcion: string;
  /** Apagado = borrador: no se ve en el sitio público y lugar y fecha son opcionales. */
  publicada: boolean;
  perrosMachos: string;
  perrosHembras: string;
  gatosMachos: string;
  gatosHembras: string;
  fotos: File[];
};

export type ErroresCampana = Partial<Record<keyof CampanaFormulario, string>>;

export type ResultadoCampana =
  | { ok: true; datos: CampanaEntrada }
  | { ok: false; errores: ErroresCampana };

function entero(valor: string): number | null {
  const limpio = valor.trim();
  if (limpio === '') return 0;
  if (!/^\d+$/.test(limpio)) return null;
  const numero = Number(limpio);
  if (numero > MAX_CONTADOR) return null;
  return numero;
}

function fechaValida(valor: string): boolean {
  if (!FECHA.test(valor)) return false;
  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export function validarCampana(formulario: CampanaFormulario): ResultadoCampana {
  const errores: ErroresCampana = {};
  const titulo = formulario.titulo.trim();
  if (!titulo) errores.titulo = textosAdmin.supuestos.obligatorio;
  else if (titulo.length > MAX_TITULO) errores.titulo = textosAdmin.supuestos.tituloLargo;

  const lugar = formulario.lugar.trim();
  if (!lugar) {
    if (formulario.publicada) errores.lugar = textosAdmin.supuestos.obligatorio;
  } else if (lugar.length > MAX_LUGAR) errores.lugar = textosAdmin.supuestos.lugarLargo;

  const descripcion = formulario.descripcion.trim();
  if (descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = textosAdmin.supuestos.descripcionLarga;
  }

  const fecha = formulario.fecha.trim();
  if (!fecha) {
    if (formulario.publicada) errores.fecha = textosAdmin.supuestos.obligatorio;
  } else if (!fechaValida(fecha)) errores.fecha = textosAdmin.supuestos.fecha;

  const perrosMachos = entero(formulario.perrosMachos);
  const perrosHembras = entero(formulario.perrosHembras);
  const gatosMachos = entero(formulario.gatosMachos);
  const gatosHembras = entero(formulario.gatosHembras);
  if (perrosMachos === null) errores.perrosMachos = textosAdmin.supuestos.contador;
  if (perrosHembras === null) errores.perrosHembras = textosAdmin.supuestos.contador;
  if (gatosMachos === null) errores.gatosMachos = textosAdmin.supuestos.contador;
  if (gatosHembras === null) errores.gatosHembras = textosAdmin.supuestos.contador;

  const errorFotos = validarImagenes(formulario.fotos);
  if (errorFotos) errores.fotos = errorFotos;

  if (
    Object.keys(errores).length > 0 ||
    perrosMachos === null ||
    perrosHembras === null ||
    gatosMachos === null ||
    gatosHembras === null
  ) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    datos: {
      titulo,
      lugar: lugar || null,
      fecha: fecha || null,
      estado: formulario.publicada ? 'publicada' : 'borrador',
      descripcion: descripcion || null,
      perrosMachos,
      perrosHembras,
      gatosMachos,
      gatosHembras,
      fotos: formulario.fotos.map((foto) => foto.name),
    },
  };
}
