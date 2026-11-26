import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PanelExportacion } from '@/components/admin/ui/PanelExportacion';
import { ErrorApiAdmin } from '@/services/admin/cliente-admin';
import { descargarAnimales, descargarCampanas } from '@/services/admin/exportacion.service';

function renderPanel(onDescargar = vi.fn(async () => undefined)) {
  const onCerrar = vi.fn();
  render(
    <PanelExportacion
      abierto
      titulo="Exportar campañas"
      resumen="Todas las campañas (sin filtros)"
      nombre="informe.csv"
      onNombre={() => undefined}
      nombreSugerido="campanas_2026-11-26"
      onCerrar={onCerrar}
      onDescargar={onDescargar}
    />,
  );
  return { onDescargar, onCerrar };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PanelExportacion', () => {
  it.each([
    ['PDF', 'pdf'],
    ['CSV (Excel)', 'csv'],
  ])('descarga en %s con la extensión del formato elegido', async (boton, formato) => {
    const { onDescargar, onCerrar } = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: boton }));

    expect(onDescargar).toHaveBeenCalledWith(formato, `informe.${formato}`);
    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
  });

  it('muestra el progreso en el botón elegido y bloquea ambos', () => {
    renderPanel(vi.fn(() => new Promise<undefined>(() => undefined)));

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));

    const generando = screen.getByRole('button', { name: 'Generando…' });
    expect(generando.getAttribute('aria-busy')).toBe('true');
    expect((generando as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'CSV (Excel)' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('muestra el error y reintenta con el mismo formato', async () => {
    const onDescargar = vi
      .fn<() => Promise<undefined>>()
      .mockRejectedValueOnce(new ErrorApiAdmin(503, 'Las campañas no están disponibles'))
      .mockResolvedValueOnce(undefined);
    const { onCerrar } = renderPanel(onDescargar);

    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Las campañas no están disponibles');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(onCerrar).toHaveBeenCalled());
    expect(onDescargar).toHaveBeenLastCalledWith('pdf', 'informe.pdf');
  });
});

describe('descarga del PDF', () => {
  const pedir = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(new Blob(['%PDF-']), { status: 200 }),
  );

  beforeEach(() => {
    pedir.mockClear();
    vi.stubGlobal('fetch', pedir);
    URL.createObjectURL = vi.fn(() => 'blob:pdf');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  const consulta = () => new URL(String(pedir.mock.calls[0]?.[0]), 'http://localhost').searchParams;

  it('pide las campañas con formato=pdf y los filtros activos', async () => {
    await descargarCampanas('pdf', { anio: 2026, mes: 11, q: ' señor ' }, 'campanas.pdf');

    expect(Object.fromEntries(consulta())).toEqual({
      formato: 'pdf',
      anio: '2026',
      mes: '11',
      q: 'señor',
    });
  });

  it('pide los animales con formato=pdf y omite los filtros vacíos', async () => {
    await descargarAnimales('pdf', { adoptado: false, q: '' }, 'animales.pdf');

    expect(Object.fromEntries(consulta())).toEqual({ formato: 'pdf', adoptado: 'false' });
  });
});
