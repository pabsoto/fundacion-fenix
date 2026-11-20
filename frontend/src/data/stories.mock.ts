// SAMPLE DATA
import type { Story } from '@/types';

export const storiesMock: Story[] = [
  {
    id: 'apolo',
    animalName: 'Apolo',
    title: { es: 'Apolo encontró un hogar', en: 'Apolo found a home' },
    text: {
      es: 'Historia ficticia de demostración: Apolo encontró un hogar y hoy disfruta una nueva etapa.',
      en: 'Fictional demo story: Apolo found a home and is now enjoying a new chapter.',
    },
    author: 'Equipo FÉNIX',
    date: '2026-09-12',
  },
  {
    id: 'luna',
    animalName: 'Luna',
    title: { es: 'Luna sigue adelante', en: 'Luna keeps going' },
    text: {
      es: 'Historia ficticia de demostración: Luna continúa recuperándose con cuidados y paciencia.',
      en: 'Fictional demo story: Luna continues recovering with care and patience.',
    },
    date: '2026-08-03',
  },
  {
    id: 'max',
    animalName: 'Max',
    title: { es: 'Max avanza cada día', en: 'Max makes progress every day' },
    text: {
      es: 'Historia ficticia de demostración: Max avanza en su recuperación mientras espera un hogar.',
      en: 'Fictional demo story: Max is making progress while waiting for a home.',
    },
    date: '2026-07-20',
  },
];
