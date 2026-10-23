import { useQuery } from '@tanstack/react-query';
import {
  getPublicContacts,
  isSafePublicContact,
  type ContactChannelType,
  type PublicContactChannel,
} from '@/services/contacts.service';

export function usePublicContacts() {
  const query = useQuery({
    queryKey: ['public-contacts'],
    queryFn: getPublicContacts,
  });
  const contacts = (query.data ?? []).filter(isSafePublicContact);

  function find(type: ContactChannelType): PublicContactChannel | undefined {
    return contacts.find((contact) => contact.tipo === type);
  }

  return { ...query, contacts, find };
}
