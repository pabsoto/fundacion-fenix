import { textosAdmin } from '@/content/textos-admin';
import {
  ESPECIES,
  SEXOS,
  UNIDADES_EDAD,
  type AnimalEntrada,
  type Especie,
  type Sexo,
  type UnidadEdad,
} from '@/types/admin';
import { validarImagen } from './imagen';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export type AnimalFormulario = {
  nombre: string;
  especie: Especie | null;
  sexo: Sexo | null;
  edadValor: string;
  edadUnidad: UnidadEdad;
  fechaIngreso: string;
  fotoIngreso: File | null;
  adoptado: boolean;
  adoptadoPor: string;
  direccionAdoptante: string;
  fotoAdopcion: File | null;
};

export type ErroresAnimal = Partial<Record<keyof AnimalFormulario, string>>;

export type ResultadoAnimal =
  | { ok: true; datos: AnimalEntrada }
  | { ok: false; errores: ErroresAnimal };

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

export function validarAnimal(formulario: AnimalFormulario): ResultadoAnimal {
  const errores: ErroresAnimal = {};
  const nombre = formulario.nombre.trim();
  if (!nombre) errores.nombre = textosAdmin.supuestos.obligatorio;
  if (!formulario.especie || !ESPECIES.includes(formulario.especie)) {
    errores.especie = textosAdmin.supuestos.obligatorio;
  }
  if (formulario.sexo && !SEXOS.includes(formulario.sexo)) {
    errores.sexo = textosAdmin.supuestos.obligatorio;
  }
  if (!UNIDADES_EDAD.includes(formulario.edadUnidad)) {
    errores.edadUnidad = textosAdmin.supuestos.obligatorio;
  }

  const edadTexto = formulario.edadValor.trim();
  let edad: AnimalEntrada['edad'] = null;
  if (edadTexto) {
    if (!/^\d+$/.test(edadTexto)) {
      errores.edadValor = textosAdmin.supuestos.entero;
    } else if (Number(edadTexto) > 40) {
      errores.edadValor = textosAdmin.supuestos.edad;
    } else {
      edad = { valor: Number(edadTexto), unidad: formulario.edadUnidad };
    }
  }

  const fecha = formulario.fechaIngreso.trim();
  if (fecha && !fechaValida(fecha)) {
    errores.fechaIngreso = textosAdmin.supuestos.fecha;
  } else if (formulario.adoptado && fecha && fecha > fechaHoy()) {
    errores.fechaIngreso = textosAdmin.supuestos.adopcionAntes;
  }

  if (formulario.fotoIngreso) {
    const error = validarImagen(formulario.fotoIngreso);
    if (error) errores.fotoIngreso = error;
  }
  if (formulario.fotoAdopcion) {
    const error = validarImagen(formulario.fotoAdopcion);
    if (error) errores.fotoAdopcion = error;
  }

  const adoptadoPor = formulario.adoptadoPor.trim();
  if (formulario.adoptado && !adoptadoPor) {
    errores.adoptadoPor = textosAdmin.supuestos.obligatorio;
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const direccion = formulario.direccionAdoptante.trim();
  return {
    ok: true,
    datos: {
      nombre,
      especie: formulario.especie as Especie,
      sexo: formulario.sexo,
      edad,
      fechaIngreso: fecha || null,
      fotoIngreso: null,
      adoptadoPor: formulario.adoptado ? adoptadoPor : null,
      direccionAdoptante: formulario.adoptado && direccion ? direccion : null,
      fotoAdopcion: null,
      fechaAdopcion: null,
    },
  };
}

function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
