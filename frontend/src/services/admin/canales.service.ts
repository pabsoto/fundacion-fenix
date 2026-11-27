import { enviarJson, pedirJson } from '@/services/admin/cliente-admin'

export type CanalFacebookAdmin = {
  tipo: 'facebook'
  url: string
  textoEs: string | null
  textoEn: string | null
  orden: number
  activo: boolean
  actualizadoEn: string
}

type CanalContactoAdmin = Omit<CanalFacebookAdmin, 'tipo'> & {
  tipo: 'whatsapp' | 'instagram' | 'tiktok' | 'email'
}

export async function getCanalFacebook(): Promise<CanalFacebookAdmin> {
  const canales = await pedirJson<Array<CanalFacebookAdmin | CanalContactoAdmin>>(
    '/admin/canales',
  )
  const canal = canales.find((item) => item.tipo === 'facebook')
  if (!canal) throw new Error('No existe el canal Facebook en la configuración.')
  return canal
}

export function actualizarUrlFacebook(
  canal: CanalFacebookAdmin,
  url: string,
): Promise<CanalFacebookAdmin> {
  return enviarJson<CanalFacebookAdmin>('PUT', '/admin/canales/facebook', {
    url,
    textoEs: canal.textoEs,
    textoEn: canal.textoEn,
    activo: canal.activo,
  })
}
