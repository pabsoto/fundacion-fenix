import { enviarArchivo, enviarJson, pedirJson } from '@/services/admin/cliente-admin'

/** Respuesta de `POST /admin/contenido/:clave/imagen`. La URL ya viene armada. */
export type ContenidoInstitucionalAdmin = {
  clave: string
  tituloEs: string | null
  tituloEn: string | null
  textoEs: string | null
  textoEn: string | null
  imagenRuta: string | null
  imagenUrl: string | null
  orden: number
  visible: boolean
  actualizadoEn: string
}

export type ActualizarContenido = {
  textoEs: string
  textoEn: string | null
  tituloEs: string | null
  tituloEn: string | null
  visible: boolean
}

export function listarContenido(): Promise<ContenidoInstitucionalAdmin[]> {
  return pedirJson<ContenidoInstitucionalAdmin[]>('/admin/contenido')
}

export function actualizarContenido(
  clave: string,
  cuerpo: ActualizarContenido,
): Promise<ContenidoInstitucionalAdmin> {
  return enviarJson<ContenidoInstitucionalAdmin>(
    'PUT',
    `/admin/contenido/${encodeURIComponent(clave)}`,
    cuerpo,
  )
}

export function reemplazarImagenContenido(
  clave: string,
  archivo: File,
): Promise<ContenidoInstitucionalAdmin> {
  return enviarArchivo<ContenidoInstitucionalAdmin>(
    `/admin/contenido/${encodeURIComponent(clave)}/imagen`,
    archivo,
  )
}
