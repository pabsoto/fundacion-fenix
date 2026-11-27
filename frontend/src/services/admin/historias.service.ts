import { validarImagen } from '@/schemas/imagen'
import {
  borrar,
  enviarArchivo,
  enviarJson,
  pedirJson,
  soloFecha,
} from '@/services/admin/cliente-admin'

/** Modelo de `GET/POST/PUT /admin/historias`. La foto llega aparte. */
export type HistoriaAdmin = {
  id: string
  animalNombre: string
  tituloEs: string
  tituloEn: string
  textoEs: string
  textoEn: string
  autorNombre: string | null
  fechaHistoria: string
  orden: number
  visible: boolean
  foto: { url: string; ancho: number; alto: number } | null
  creadoEn: string
  actualizadoEn: string
}

/** Cuerpo de crear y de editar, sin `visible` ni `orden`. */
export type GuardarHistoria = {
  animalNombre: string
  tituloEs: string
  tituloEn: string
  textoEs: string
  textoEn: string
  autorNombre: string | null
  fechaHistoria: string
}

export type ResultadoGuardadoHistoria = {
  historia: HistoriaAdmin | null
  archivoPendiente: File | null
  publicarPendiente: boolean
}

function desdeApi(dto: HistoriaAdmin): HistoriaAdmin {
  return {
    ...dto,
    autorNombre: dto.autorNombre?.trim() ? dto.autorNombre : null,
    fechaHistoria: soloFecha(dto.fechaHistoria) ?? dto.fechaHistoria,
    foto: dto.foto ? { url: dto.foto.url, ancho: dto.foto.ancho, alto: dto.foto.alto } : null,
  }
}

export function listarHistorias(signal?: AbortSignal): Promise<HistoriaAdmin[]> {
  return pedirJson<HistoriaAdmin[]>('/admin/historias', signal).then((lista) => lista.map(desdeApi))
}

/** Crea la historia oculta, sin foto y al final del orden. */
export async function crearHistoria(entrada: GuardarHistoria): Promise<HistoriaAdmin> {
  return desdeApi(await enviarJson<HistoriaAdmin>('POST', '/admin/historias', entrada))
}

export async function actualizarHistoria(
  id: string,
  entrada: GuardarHistoria & { visible: boolean },
): Promise<HistoriaAdmin> {
  return desdeApi(
    await enviarJson<HistoriaAdmin>('PUT', `/admin/historias/${encodeURIComponent(id)}`, entrada),
  )
}

/** Borrado lógico. La foto se borra en el servidor. */
export function eliminarHistoria(id: string): Promise<void> {
  return borrar(`/admin/historias/${encodeURIComponent(id)}`)
}

export function reordenarHistorias(ids: string[]): Promise<HistoriaAdmin[]> {
  return enviarJson<HistoriaAdmin[]>('PUT', '/admin/historias/orden', { ids }).then((lista) =>
    lista.map(desdeApi),
  )
}

/**
 * La foto va después de crear o editar. El ancho y el alto no se envían:
 * el backend los lee del archivo.
 */
export async function subirFotoHistoria(id: string, archivo: File): Promise<HistoriaAdmin> {
  const error = validarImagen(archivo)
  if (error) throw new Error(error)
  return desdeApi(
    await enviarArchivo<HistoriaAdmin>(`/admin/historias/${encodeURIComponent(id)}/foto`, archivo),
  )
}

async function publicarSiFalta(
  historia: HistoriaAdmin,
  entrada: GuardarHistoria,
  visible: boolean,
): Promise<ResultadoGuardadoHistoria> {
  if (visible && !historia.visible) {
    try {
      const publicada = await actualizarHistoria(historia.id, { ...entrada, visible: true })
      return { historia: publicada, archivoPendiente: null, publicarPendiente: false }
    } catch {
      return { historia, archivoPendiente: null, publicarPendiente: true }
    }
  }
  if (!visible && historia.visible) {
    const oculta = await actualizarHistoria(historia.id, { ...entrada, visible: false })
    return { historia: oculta, archivoPendiente: null, publicarPendiente: false }
  }
  return { historia, archivoPendiente: null, publicarPendiente: false }
}

/**
 * Guarda el texto primero. La foto, si hay, se sube después y no duplica la
 * historia si falla. Publicar (`visible`) espera a que exista foto.
 */
export async function guardarHistoria(opciones: {
  id?: string
  entrada: GuardarHistoria
  visible: boolean
  foto: File | null
  tieneFoto: boolean
}): Promise<ResultadoGuardadoHistoria> {
  const { id, entrada, visible, foto, tieneFoto } = opciones
  if (foto) {
    const error = validarImagen(foto)
    if (error) throw new Error(error)
  }

  let historia = id
    ? await actualizarHistoria(id, { ...entrada, visible: visible && tieneFoto })
    : await crearHistoria(entrada)

  if (foto) {
    try {
      historia = await subirFotoHistoria(historia.id, foto)
    } catch {
      return {
        historia,
        archivoPendiente: foto,
        publicarPendiente: visible && !historia.visible,
      }
    }
  }

  return publicarSiFalta(historia, entrada, visible)
}

/** Reintenta la foto o la publicación sin volver a crear la historia. */
export async function reintentarFotoHistoria(opciones: {
  id: string
  entrada: GuardarHistoria
  archivo: File | null
  publicar: boolean
}): Promise<ResultadoGuardadoHistoria> {
  let historia: HistoriaAdmin | null = null
  if (opciones.archivo) {
    try {
      historia = await subirFotoHistoria(opciones.id, opciones.archivo)
    } catch {
      return {
        historia: null,
        archivoPendiente: opciones.archivo,
        publicarPendiente: opciones.publicar,
      }
    }
  }
  if (opciones.publicar) {
    try {
      historia = await actualizarHistoria(opciones.id, { ...opciones.entrada, visible: true })
    } catch {
      return { historia, archivoPendiente: null, publicarPendiente: true }
    }
  }
  return { historia, archivoPendiente: null, publicarPendiente: false }
}
