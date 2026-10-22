export const SECTION_IDS = {
  home: 'inicio',
  about: 'quienes-somos',
  pillars: 'lo-que-hacemos',
  program: 'nuestro-programa',
  results: 'resultados',
  collaborate: 'como-colaborar',
  donate: 'donar',
  contact: 'contactos',
} as const;

export const WHATSAPP_URL =
  import.meta.env.VITE_WHATSAPP_URL || 'https://wa.link/3nk27o';

export const SOCIAL = {
  facebook: 'https://www.facebook.com/fundacionfenixlpb',
  instagram: 'https://www.instagram.com/fundacion.fenix.lpb',
  tiktok: 'https://www.tiktok.com/@fundacin.fenix.lp',
  email: 'fenixlpbfundacion@gmail.com',
} as const;

export const BANK = {
  holder: 'FUNDACION FENIX',
  bank: 'Banco de Crédito',
  phone: '76560084',
  reference: 'FUNDACION FENIX',
} as const;
