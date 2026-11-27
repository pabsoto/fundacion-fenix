import { enviarJson, pedirJson } from '@/services/admin/cliente-admin'

export type TipoCanalAdmin = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'email'

export type CanalAdmin = {
  tipo: TipoCanalAdmin
  url: string
  textoEs: string | null
  textoEn: string | null
  orden: number
  activo: boolean
  actualizadoEn: string
}

export type CanalFacebookAdmin = Omit<CanalAdmin, 'tipo'> & { tipo: 'facebook' }

export type EntradaCanal = {
  url: string
  textoEs: string | null
}

export function listarCanales(): Promise<CanalAdmin[]> {
  return pedirJson<CanalAdmin[]>('/admin/canales')
}

function esFacebook(canal: CanalAdmin): canal is CanalFacebookAdmin {
  return canal.tipo === 'facebook'
}

export async function getCanalFacebook(): Promise<CanalFacebookAdmin> {
  const canales = await listarCanales()
  const canal = canales.find(esFacebook)
  if (!canal) {
    throw new Error('No existe el canal Facebook en la configuración.')
  }
  return canal
}

/** Reenvía `textoEn` y `activo` tal como llegaron: el panel no los edita. */
export function actualizarCanal(canal: CanalAdmin, entrada: EntradaCanal): Promise<CanalAdmin> {
  return enviarJson<CanalAdmin>('PUT', `/admin/canales/${canal.tipo}`, {
    url: entrada.url,
    textoEs: entrada.textoEs,
    textoEn: canal.textoEn,
    activo: canal.activo,
  })
}

export function actualizarUrlFacebook(
  canal: CanalFacebookAdmin,
  url: string,
): Promise<CanalFacebookAdmin> {
  return actualizarCanal(canal, { url, textoEs: canal.textoEs }) as Promise<CanalFacebookAdmin>
}
