import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '@/i18n';
import { storiesMock } from '@/data/stories.mock';
import type { Story } from '@/types';
import { Stories } from './Stories';

const { estado } = vi.hoisted(() => ({
  estado: {
    stories: [] as Story[],
    isPending: false,
    isError: false,
  },
}));

vi.mock('@/hooks/useStories', () => ({
  useStories: () => ({
    data: estado.isPending || estado.isError ? undefined : estado.stories,
    isPending: estado.isPending,
    isError: estado.isError,
  }),
}));

vi.mock('@/hooks/useCarousel', () => ({
  useCarousel: () => ({
    emblaRef: vi.fn(),
    scrollPrev: vi.fn(),
    scrollNext: vi.fn(),
    canPrev: false,
    canNext: true,
  }),
}));

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: true }));

function historia(indice: number, parcial: Partial<Story> = {}): Story {
  return {
    id: `h-${indice}`,
    animalName: `Animal ${indice}`,
    title: { es: `Título ${indice}`, en: `Title ${indice}` },
    text: { es: `Texto ${indice}`, en: `Text ${indice}` },
    date: '2026-03-08',
    ...parcial,
  };
}

function historias(cantidad: number): Story[] {
  return Array.from({ length: cantidad }, (_, indice) => historia(indice + 1));
}

function botonAnterior() {
  return screen.queryByRole('button', { name: 'Ver historias anteriores' });
}

afterEach(() => {
  cleanup();
  estado.stories = [];
  estado.isPending = false;
  estado.isError = false;
  void i18n.changeLanguage('es');
});

describe('Stories en modo demostración', () => {
  it('muestra título, fecha y autor de las historias ficticias', async () => {
    estado.stories = storiesMock;
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByText('Datos de demostración')).toBeTruthy();
    for (const title of ['Apolo encontró un hogar', 'Luna sigue adelante', 'Max avanza cada día']) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getByText('12 de septiembre de 2026')).toBeTruthy();
    expect(screen.getByText('Por Equipo FÉNIX')).toBeTruthy();
    expect(screen.queryByText('Adoptado')).toBeNull();
    expect(screen.queryByText('En recuperación')).toBeNull();
    expect(screen.getAllByText(/Historia ficticia de demostración:/)).toHaveLength(3);
    expect(document.querySelector('.grid')).toBeTruthy();
    expect(botonAnterior()).toBeNull();
  });
});

describe('Stories según la cantidad', () => {
  it('sin historias conserva el título y el aviso de sección vacía', async () => {
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByRole('heading', { name: 'Historias que transforman vidas' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Aún no hay historias oficiales publicadas.');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(botonAnterior()).toBeNull();
  });

  it('con una historia usa cuadrícula y el idioma activo', async () => {
    estado.stories = [historia(1)];
    await i18n.changeLanguage('en');
    render(<Stories />);

    expect(screen.getByRole('heading', { name: 'Title 1' })).toBeTruthy();
    expect(screen.getByText('Text 1')).toBeTruthy();
    expect(screen.queryByText('Título 1')).toBeNull();
    expect(document.querySelector('.grid')).toBeTruthy();
    expect(botonAnterior()).toBeNull();
  });

  it('pasa de cuadrícula a carrusel entre 3 y 4 historias', async () => {
    estado.stories = historias(3);
    await i18n.changeLanguage('es');
    const vistaCuadricula = render(<Stories />);

    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(vistaCuadricula.container.querySelector('.grid')).toBeTruthy();
    expect(botonAnterior()).toBeNull();
    vistaCuadricula.unmount();

    estado.stories = historias(4);
    const carrusel = render(<Stories />);

    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(carrusel.container.querySelector('.grid')).toBeNull();
    expect(botonAnterior()).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ver más historias' })).toBeTruthy();
  });

  it('con 7 historias sigue en el carrusel', async () => {
    estado.stories = historias(7);
    await i18n.changeLanguage('es');
    const vista = render(<Stories />);

    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(vista.container.querySelector('.grid')).toBeNull();
    expect(botonAnterior()).toBeTruthy();
  });
});

describe('fotos de las historias', () => {
  it('muestra verticales y horizontales completas, y un recuadro si falta la foto', async () => {
    estado.stories = [
      historia(1, {
        animalName: 'Luna',
        photo: 'https://cdn.test/luna.jpg',
        photoWidth: 900,
        photoHeight: 1600,
      }),
      historia(2, {
        animalName: 'Max',
        photo: 'https://cdn.test/max.webp',
        photoWidth: 1600,
        photoHeight: 900,
      }),
      historia(3, { animalName: 'Nube' }),
    ];
    await i18n.changeLanguage('es');
    render(<Stories />);

    const vertical = screen.getByRole('img', { name: 'Luna' });
    const horizontal = screen.getByRole('img', { name: 'Max' });

    expect(vertical.getAttribute('width')).toBe('900');
    expect(vertical.getAttribute('height')).toBe('1600');
    expect(vertical.className).toContain('object-contain');
    expect(vertical.className).not.toContain('object-cover');
    expect(horizontal.getAttribute('width')).toBe('1600');
    expect(horizontal.getAttribute('height')).toBe('900');
    expect(horizontal.className).toContain('object-contain');
    expect(screen.getByText('Foto · Mascota')).toBeTruthy();
    expect(screen.queryByRole('img', { name: 'Nube' })).toBeNull();
  });

  it('sustituye una URL que falla por el recuadro de la foto', async () => {
    estado.stories = [
      historia(1, {
        animalName: 'Luna',
        photo: 'https://cdn.test/rota.jpg',
        photoWidth: 900,
        photoHeight: 1600,
      }),
    ];
    await i18n.changeLanguage('es');
    render(<Stories />);

    fireEvent.error(screen.getByRole('img', { name: 'Luna' }));

    expect(screen.queryByRole('img', { name: 'Luna' })).toBeNull();
    expect(screen.getByText('Foto · Mascota')).toBeTruthy();
  });
});

describe('estados de la sección', () => {
  it('muestra la carga sin el aviso de lista vacía', async () => {
    estado.isPending = true;
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByRole('status').textContent).toBe('Cargando historias…');
    expect(screen.queryByText('Aún no hay historias oficiales publicadas.')).toBeNull();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });

  it('muestra el error sin romper la sección', async () => {
    estado.isError = true;
    await i18n.changeLanguage('es');
    render(<Stories />);

    expect(screen.getByRole('heading', { name: 'Historias que transforman vidas' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'No fue posible cargar las historias en este momento.',
    );
    expect(screen.queryByText('Aún no hay historias oficiales publicadas.')).toBeNull();
  });
});
