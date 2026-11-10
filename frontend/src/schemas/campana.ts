import { textosAdmin } from '@/content/textos-admin';
import type { CampanaEntrada } from '@/types/admin';
import { validarImagenes } from './imagen';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type CampanaFormulario = {
  titulo: string;
  lugar: string;
  fecha: string;
  descripcion: string;
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
  if (!/^\d+$/.test(limpio)) return null;
  return Number(limpio);
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

  const fecha = formulario.fecha.trim();
  if (!fecha) errores.fecha = textosAdmin.supuestos.obligatorio;
  else if (!fechaValida(fecha)) errores.fecha = textosAdmin.supuestos.fecha;

  const perrosMachos = entero(formulario.perrosMachos);
  const perrosHembras = entero(formulario.perrosHembras);
  const gatosMachos = entero(formulario.gatosMachos);
  const gatosHembras = entero(formulario.gatosHembras);
  if (perrosMachos === null) errores.perrosMachos = textosAdmin.supuestos.entero;
  if (perrosHembras === null) errores.perrosHembras = textosAdmin.supuestos.entero;
  if (gatosMachos === null) errores.gatosMachos = textosAdmin.supuestos.entero;
  if (gatosHembras === null) errores.gatosHembras = textosAdmin.supuestos.entero;

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

  const lugar = formulario.lugar.trim();
  const descripcion = formulario.descripcion.trim();
  return {
    ok: true,
    datos: {
      titulo,
      lugar: lugar || null,
      fecha,
      descripcion: descripcion || null,
      perrosMachos,
      perrosHembras,
      gatosMachos,
      gatosHembras,
      fotos: formulario.fotos.map((foto) => foto.name),
    },
  };
}
