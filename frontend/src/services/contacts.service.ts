const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export type ContactChannelType = 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'email'

export type PublicContactChannel = {
  tipo: ContactChannelType
  url: string
  texto: {
    es: string | null
    en: string | null
  }
  orden: number
}

export async function getPublicContacts(): Promise<PublicContactChannel[]> {
  const response = await fetch(`${API_URL}/public/contactos`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`No se pudieron obtener los contactos (${response.status})`)
  }

  const contacts: unknown = await response.json()
  if (!Array.isArray(contacts)) {
    throw new Error('La API devolvió un formato de contactos inválido')
  }

  return contacts as PublicContactChannel[]
}

export function isSafePublicContact(contact: PublicContactChannel): boolean {
  try {
    const url = new URL(contact.url)
    if (contact.tipo === 'email') return url.protocol === 'mailto:'
    return url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isValidWhatsAppUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()

    return (
      url.protocol === 'https:' &&
      (hostname === 'wa.me' ||
        hostname === 'wa.link' ||
        hostname === 'whatsapp.com' ||
        hostname.endsWith('.whatsapp.com'))
    )
  } catch {
    return false
  }
}
