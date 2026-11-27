import { textosAdmin } from '@/content/textos-admin'
import { validarImagen } from '@/schemas/imagen'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export const MAX_ANIMAL_HISTORIA = 100
export const MAX_TITULO_HISTORIA = 200
export const MAX_TEXTO_HISTORIA = 4_000
export const MAX_AUTOR_HISTORIA = 100

export type FormularioHistoria = {
  animalNombre: string
  tituloEs: string
  tituloEn: string
  textoEs: string
  textoEn: string
  autorNombre: string
  fechaHistoria: string
  visible: boolean
  foto: File | null
}

export type DatosHistoria = {
  animalNombre: string
  tituloEs: string
  tituloEn: string
  textoEs: string
  textoEn: string
  autorNombre: string | null
  fechaHistoria: string
  visible: boolean
  foto: File | null
}

export type ErroresHistoria = Partial<
  Record<
    | 'animalNombre'
    | 'tituloEs'
    | 'tituloEn'
    | 'textoEs'
    | 'textoEn'
    | 'autorNombre'
    | 'fechaHistoria'
    | 'foto',
    string
  >
>

export type ResultadoHistoria =
  { ok: true; datos: DatosHistoria } | { ok: false; errores: ErroresHistoria }

function fechaValida(valor: string): boolean {
  if (!FECHA.test(valor)) return false
  const [anio, mes, dia] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return (
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
  )
}

function obligatorio(valor: string, maximo: number, largo: string): string | undefined {
  const limpio = valor.trim()
  if (!limpio) return textosAdmin.supuestos.obligatorio
  if (limpio.length > maximo) return largo
  return undefined
}

export function validarHistoria(
  formulario: FormularioHistoria,
  tieneFotoGuardada: boolean,
): ResultadoHistoria {
  const textos = textosAdmin.contenido.historiasForm
  const errores: ErroresHistoria = {}
  const animal = obligatorio(formulario.animalNombre, MAX_ANIMAL_HISTORIA, textos.animalLargo)
  const tituloEs = obligatorio(formulario.tituloEs, MAX_TITULO_HISTORIA, textos.tituloLargo)
  const tituloEn = obligatorio(formulario.tituloEn, MAX_TITULO_HISTORIA, textos.tituloLargo)
  const textoEs = obligatorio(formulario.textoEs, MAX_TEXTO_HISTORIA, textos.textoLargo)
  const textoEn = obligatorio(formulario.textoEn, MAX_TEXTO_HISTORIA, textos.textoLargo)
  const autor = formulario.autorNombre.trim()
  if (animal) errores.animalNombre = animal
  if (tituloEs) errores.tituloEs = tituloEs
  if (tituloEn) errores.tituloEn = tituloEn
  if (textoEs) errores.textoEs = textoEs
  if (textoEn) errores.textoEn = textoEn
  if (autor.length > MAX_AUTOR_HISTORIA) errores.autorNombre = textos.autorLargo
  if (!formulario.fechaHistoria.trim()) errores.fechaHistoria = textosAdmin.supuestos.obligatorio
  else if (!fechaValida(formulario.fechaHistoria)) {
    errores.fechaHistoria = textosAdmin.supuestos.fecha
  }
  if (formulario.foto) {
    const foto = validarImagen(formulario.foto)
    if (foto) errores.foto = foto
  } else if (formulario.visible && !tieneFotoGuardada) {
    errores.foto = textos.sinFotoPublicar
  }
  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    datos: {
      animalNombre: formulario.animalNombre.trim(),
      tituloEs: formulario.tituloEs.trim(),
      tituloEn: formulario.tituloEn.trim(),
      textoEs: formulario.textoEs.trim(),
      textoEn: formulario.textoEn.trim(),
      autorNombre: autor || null,
      fechaHistoria: formulario.fechaHistoria,
      visible: formulario.visible,
      foto: formulario.foto,
    },
  }
}
