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

export const WHATSAPP_PHONE = (
  import.meta.env.VITE_WHATSAPP_PHONE || '59170544491'
).replace(/\D/g, '');
export const WHATSAPP_MESSAGE =
  import.meta.env.VITE_WHATSAPP_MESSAGE ||
  'Hola, me gustaría obtener información sobre la Fundación FÉNIX LPB.';

if (!WHATSAPP_PHONE) {
  throw new Error(
    'VITE_WHATSAPP_PHONE debe incluir el código de país y el número.',
  );
}

export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

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
