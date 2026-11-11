import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '@/i18n';
import { useInstitutionalContent } from './useInstitutionalContent';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useInstitutionalContent', () => {
  it('muestra las traducciones locales cuando falla el servicio institucional', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('API unavailable');
      }),
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    await i18n.changeLanguage('en');
    const { result, rerender } = renderHook(() => useInstitutionalContent(), {
      wrapper,
    });

    expect(result.current.text('pilar_rehabilitacion', 'titulo')).toBe(
      'Comprehensive rehabilitation',
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.text('pilar_rehabilitacion')).toContain(
      'physical and emotional health',
    );

    await i18n.changeLanguage('es');
    rerender();
    expect(result.current.text('pilar_rehabilitacion', 'titulo')).toBe(
      'Rehabilitación integral',
    );
  });

  it('selecciona títulos y descripciones de la API en español e inglés', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([
      {
        clave: 'pilar_rehabilitacion',
        titulo: { es: 'Rehabilitación integral', en: 'Comprehensive rehabilitation' },
        descripcion: { es: 'Descripción ES', en: 'Description EN' },
        imagenUrl: null,
        orden: 210,
      },
    ]), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    await i18n.changeLanguage('es');
    const { result, rerender } = renderHook(() => useInstitutionalContent(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.text('pilar_rehabilitacion', 'titulo')).toBe('Rehabilitación integral');
    expect(result.current.text('pilar_rehabilitacion')).toBe('Descripción ES');

    await i18n.changeLanguage('en');
    rerender();
    expect(result.current.text('pilar_rehabilitacion', 'titulo')).toBe('Comprehensive rehabilitation');
    expect(result.current.text('pilar_rehabilitacion')).toBe('Description EN');
  });
});
