import { useQuery } from '@tanstack/react-query'
import {
  getPublicContacts,
  isValidWhatsAppUrl,
  type PublicContactChannel,
} from '@/services/contacts.service'

export function useWhatsAppContact() {
  return useQuery({
    queryKey: ['public-contacts'],
    queryFn: getPublicContacts,
    select: (contacts): PublicContactChannel | null => {
      const whatsapp = contacts.find((contact) => contact.tipo === 'whatsapp')

      return whatsapp && isValidWhatsAppUrl(whatsapp.url) ? whatsapp : null
    },
  })
}
