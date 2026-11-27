import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { textosAdmin } from '@/content/textos-admin';
import { MAXIMO_QR_BYTES, MAXIMO_QR_MB } from '@/schemas/imagen';
import {
  deleteDonationQr,
  getAdminDonation,
  saveAdminDonation,
  uploadDonationQr,
  type AdminDonation,
} from '@/services/admin-donations.service';
import { AdminDonationPanel, AVISO_EXITO_MS, AVISO_SALIDA_MS } from './AdminDonationPanel';

const vista = vi.hoisted(() => ({ movil: false }));
vi.mock('@/hooks/useVistaMovil', () => ({
  useVistaMovil: () => vista.movil,
}));

const textos = textosAdmin.donaciones;
const supuestos = textosAdmin.supuestos;

const donation: AdminDonation = {
  titular: 'Fundación Fénix LPB',
  banco: 'Banco oficial',
  telefono: '70000000',
  referencia: 'Donación',
  numeroCuenta: null,
  avisoEs: 'Verifique el titular',
  avisoEn: 'Verify the holder',
  activo: true,
  qrUrl: 'https://sitio.example/qr.png',
  actualizadoEn: '2026-11-03T16:00:00.000Z',
  qr: { disponible: true, venceEl: '2027-12-31' },
};

vi.mock('@/services/admin-donations.service', () => ({
  getAdminDonation: vi.fn(),
  saveAdminDonation: vi.fn(),
  uploadDonationQr: vi.fn(),
  deleteDonationQr: vi.fn(),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <AdminDonationPanel csrfToken="csrf" />
    </QueryClientProvider>,
  );
  return invalidateQueries;
}

function archivo(nombre: string, type: string, bytes = 8) {
  return new File([new Uint8Array(bytes)], nombre, { type });
}

async function elegirQr(file: File = archivo('qr.png', 'image/png')) {
  fireEvent.change(screen.getByLabelText(textos.cambiarImagen), {
    target: { files: [file] },
  });
}

beforeEach(() => {
  vista.movil = false;
  vi.mocked(getAdminDonation).mockResolvedValue(donation);
  vi.mocked(saveAdminDonation).mockResolvedValue(donation);
  vi.mocked(uploadDonationQr).mockResolvedValue(undefined);
  vi.mocked(deleteDonationQr).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminDonationPanel', () => {
  it('al guardar invalida la clave public-donation', async () => {
    const invalidateQueries = renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');

    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['public-donation'] });
    });
  });

  it('al subir o quitar el QR invalida la clave public-donation', async () => {
    const invalidateQueries = renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');

    await elegirQr();
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    expect((await screen.findByRole('status')).textContent).toContain(supuestos.guardado);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['public-donation'] });

    invalidateQueries.mockClear();
    fireEvent.click(screen.getByRole('button', { name: textosAdmin.nuevaCampana.quitarFoto }));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['public-donation'] });
    });
    expect(deleteDonationQr).toHaveBeenCalledWith('csrf');
  });

  it('marca los campos obligatorios y no envía', async () => {
    renderPanel();
    const titular = await screen.findByLabelText(textos.titular);
    fireEvent.change(titular, { target: { value: '   ' } });
    fireEvent.change(screen.getByLabelText(textos.banco), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(textos.telefono), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(textos.referencia), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    expect(screen.getAllByText(supuestos.obligatorio)).toHaveLength(4);
    expect(saveAdminDonation).not.toHaveBeenCalled();
  });

  it('al guardar envía activo y qrVenceEl', async () => {
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '2027-12-31' } });
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    await waitFor(() => {
      expect(saveAdminDonation).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true, qrVenceEl: '2027-12-31' }),
        'csrf',
      );
    });
  });

  it('una fecha vacía envía qrVenceEl null', async () => {
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    await waitFor(() => {
      expect(saveAdminDonation).toHaveBeenCalledWith(
        expect.objectContaining({ qrVenceEl: null }),
        'csrf',
      );
    });
  });

  it('pide confirmación antes de subir un QR nuevo y reenvía la misma fecha', async () => {
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '2028-01-15' } });
    await elegirQr();
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    expect(saveAdminDonation).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: supuestos.confirmarQrTitulo })).toBeTruthy();
    expect(screen.getByText(supuestos.confirmarQr)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    await waitFor(() => {
      expect(uploadDonationQr).toHaveBeenCalledWith(expect.any(File), '2028-01-15', 'csrf');
    });
    expect(saveAdminDonation).toHaveBeenCalledWith(
      expect.objectContaining({ qrVenceEl: '2028-01-15', activo: true }),
      'csrf',
    );
  });

  it('rechaza un QR de tipo inválido o de más de 2 MB', async () => {
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    const mensaje = textos.imagenInvalida(MAXIMO_QR_MB);

    await elegirQr(archivo('nota.txt', 'text/plain'));
    expect(screen.getByText(mensaje)).toBeTruthy();

    await elegirQr(archivo('grande.png', 'image/png', MAXIMO_QR_BYTES + 1));
    expect(screen.getByText(mensaje)).toBeTruthy();
    expect(uploadDonationQr).not.toHaveBeenCalled();
  });

  it('si el QR no se sube, permite reintentar solo la subida', async () => {
    vi.mocked(uploadDonationQr).mockRejectedValueOnce(new Error('red'));
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    await elegirQr();
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    expect((await screen.findByRole('alert')).textContent).toContain(supuestos.qrNoSubio);
    expect(saveAdminDonation).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: supuestos.reintentar }));

    await waitFor(() => {
      expect(uploadDonationQr).toHaveBeenCalledTimes(2);
    });
    expect(saveAdminDonation).toHaveBeenCalledTimes(1);
  });

  it('un doble clic no duplica el envío', async () => {
    let liberar: (valor: AdminDonation) => void = () => {};
    vi.mocked(saveAdminDonation).mockImplementation(
      () =>
        new Promise((resolve) => {
          liberar = resolve;
        }),
    );
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    const guardar = screen.getByRole('button', { name: textos.guardar });
    fireEvent.click(guardar);
    fireEvent.click(guardar);

    expect(saveAdminDonation).toHaveBeenCalledTimes(1);
    liberar(donation);
  });

  it('al apagar el interruptor pide confirmación y envía activo false', async () => {
    renderPanel();
    await screen.findByDisplayValue('Fundación Fénix LPB');
    fireEvent.click(screen.getByRole('switch', { name: new RegExp(textos.mostrar) }));
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    expect(saveAdminDonation).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: supuestos.ocultarDonacionTitulo })).toBeTruthy();
    expect(screen.getByText(supuestos.ocultarDonacion)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    await waitFor(() => {
      expect(saveAdminDonation).toHaveBeenCalledWith(
        expect.objectContaining({ activo: false }),
        'csrf',
      );
    });
    expect(uploadDonationQr).not.toHaveBeenCalled();
  });

  it('donacion null muestra el formulario vacío con el interruptor encendido', async () => {
    vi.mocked(getAdminDonation).mockResolvedValue(null);
    renderPanel();

    const interruptor = await screen.findByRole('switch', { name: new RegExp(textos.mostrar) });
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect((screen.getByLabelText(textos.titular) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(textos.banco) as HTMLInputElement).value).toBe('');
    expect(screen.queryByRole('button', { name: textosAdmin.nuevaCampana.quitarFoto })).toBeNull();
  });

  it('toma los textos de textosAdmin', async () => {
    renderPanel();
    expect(await screen.findByRole('heading', { name: textos.titulo })).toBeTruthy();
    expect(screen.getByText(textos.subtitulo)).toBeTruthy();
    expect(screen.getByText(textos.cuentaNota)).toBeTruthy();
    expect(screen.getByText(textos.mostrarNota)).toBeTruthy();
    expect(
      screen.getByText(textos.ultimaActualizacion(textos.fechaCorta(3, 'nov', 2026))),
    ).toBeTruthy();
    expect(screen.getByText(textos.vistaNota)).toBeTruthy();
    expect(screen.getByText(textos.englishNota)).toBeTruthy();
    expect(screen.getByRole('button', { name: textos.descartar })).toBeTruthy();
  });

  it('si hay cambios, Descartar pide confirmación y restaura el último guardado', async () => {
    renderPanel();
    const titular = await screen.findByLabelText(textos.titular);
    fireEvent.change(titular, { target: { value: 'Otro titular' } });
    fireEvent.click(screen.getByRole('button', { name: textos.descartar }));

    expect(screen.getByRole('dialog', { name: supuestos.descartarTitulo })).toBeTruthy();
    expect(screen.getByText(supuestos.descartarCambios)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    expect((screen.getByLabelText(textos.titular) as HTMLInputElement).value).toBe(donation.titular);
    expect(saveAdminDonation).not.toHaveBeenCalled();
  });

  it('muestra el qrUrl guardado en la miniatura y en la tarjeta', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    const imagenes = [...document.querySelectorAll('img')].filter(
      (img) => img.getAttribute('src') === donation.qrUrl,
    );
    expect(imagenes).toHaveLength(2);
    expect(screen.getAllByText(textos.qrActual).length).toBeGreaterThan(0);
    expect(screen.getByText(textos.venceElFecha(textos.fechaCorta(31, 'dic', 2027)))).toBeTruthy();
  });

  it('previsualiza el QR nuevo con una object URL y la revoca al cambiar, quitar o desmontar', async () => {
    const urls: string[] = [];
    const original = URL.createObjectURL.bind(URL);
    const crear = vi.spyOn(URL, 'createObjectURL').mockImplementation((objeto) => {
      const url = original(objeto);
      urls.push(url);
      return url;
    });
    const revocar = vi.spyOn(URL, 'revokeObjectURL');

    try {
      const { unmount } = render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <AdminDonationPanel csrfToken="csrf" />
        </QueryClientProvider>,
      );
      await screen.findByDisplayValue(donation.titular);

      await elegirQr(archivo('nuevo.png', 'image/png'));
      expect(screen.getAllByText(textos.qrNuevo).length).toBeGreaterThan(0);
      expect(urls.length).toBeGreaterThan(0);
      const primera = [...urls];
      expect(
        [...document.querySelectorAll('img')].some((img) => primera.includes(img.getAttribute('src') ?? '')),
      ).toBe(true);

      await elegirQr(archivo('otro.png', 'image/png'));
      await waitFor(() => {
        expect(primera.every((url) => revocar.mock.calls.some((llamada) => llamada[0] === url))).toBe(true);
      });

      fireEvent.click(screen.getByRole('button', { name: textosAdmin.nuevaCampana.quitarFoto }));
      await waitFor(() => {
        expect(revocar.mock.calls.length).toBeGreaterThan(primera.length);
      });
      expect(deleteDonationQr).not.toHaveBeenCalled();
      expect(screen.getAllByText(textos.qrActual).length).toBeGreaterThan(0);

      await elegirQr(archivo('final.png', 'image/png'));
      const antesDeDesmontar = revocar.mock.calls.length;
      unmount();
      expect(revocar.mock.calls.length).toBeGreaterThan(antesDeDesmontar);
    } finally {
      crear.mockRestore();
      revocar.mockRestore();
    }
  });

  it('si la imagen no carga, muestra el recuadro de respaldo', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    const imagenes = [...document.querySelectorAll('img')].filter(
      (img) => img.getAttribute('src') === donation.qrUrl,
    );
    expect(imagenes.length).toBeGreaterThan(0);
    for (const img of imagenes) fireEvent.error(img);

    expect(
      [...document.querySelectorAll('img')].some((img) => img.getAttribute('src') === donation.qrUrl),
    ).toBe(false);
    expect(screen.getAllByRole('img', { name: textos.qrActual }).length).toBeGreaterThan(0);
  });

  it('cambia el estado al editar la fecha, sin guardar', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '2000-01-01' } });
    expect(screen.getAllByText(textos.vencido).length).toBeGreaterThan(1);
    expect(screen.getByRole('status').textContent).toContain(textos.vencido);
    expect(screen.getByText(textos.cajaQrPublica)).toBeTruthy();
    expect(screen.getByText(textos.qrNoDisponible)).toBeTruthy();
    expect(saveAdminDonation).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '' } });
    expect(screen.getByText(textos.sinFechaVencimiento)).toBeTruthy();
    expect(screen.queryByText(textos.qrNoDisponible)).toBeNull();
    expect(saveAdminDonation).not.toHaveBeenCalled();
  });

  it('sin QR muestra el estado en el formulario y el recuadro gris en la tarjeta', async () => {
    vi.mocked(getAdminDonation).mockResolvedValue({
      ...donation,
      qrUrl: null,
      qr: { disponible: false, venceEl: null },
    });
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    expect(screen.getAllByText(textos.sinQr).length).toBeGreaterThan(1);
    expect(screen.getByRole('status').textContent).toContain(textos.sinQr);
    expect(screen.getByText(textos.cajaQrPublica)).toBeTruthy();
    expect(screen.getByText(textos.qrNoDisponible)).toBeTruthy();
    expect(document.querySelector('img')).toBeNull();
  });

  it('con el interruptor apagado indica que la tarjeta no aparecerá en el sitio', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    fireEvent.click(screen.getByRole('switch', { name: new RegExp(textos.mostrar) }));
    expect(screen.getByRole('status').textContent).toContain(textos.noAparecera);
  });

  it('oculta el aviso de la tarjeta si el español está vacío', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    const tarjeta = document.querySelector('aside');
    expect(tarjeta?.textContent).toContain(donation.avisoEs);
    fireEvent.change(screen.getByLabelText(textos.aviso), { target: { value: '   ' } });
    expect(tarjeta?.textContent).not.toContain(donation.avisoEs);
  });

  it('avisa cuando los datos parecen de demostración', async () => {
    renderPanel();
    const titular = await screen.findByLabelText(textos.titular);
    fireEvent.change(titular, { target: { value: 'DEMO - NO REALIZAR DONACIONES' } });
    expect(screen.getByRole('status').textContent).toContain(textos.demoAviso);
    expect(saveAdminDonation).not.toHaveBeenCalled();
  });

  it('tras guardar vuelve a pedir el GET admin y muestra el qrUrl nuevo', async () => {
    const renovada: AdminDonation = {
      ...donation,
      qrUrl: 'https://sitio.example/qr-nuevo.png',
      actualizadoEn: '2026-11-26T18:00:00.000Z',
    };
    vi.mocked(getAdminDonation).mockResolvedValueOnce(donation).mockResolvedValueOnce(renovada);
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    await waitFor(() => {
      expect(
        [...document.querySelectorAll('img')].some(
          (img) => img.getAttribute('src') === renovada.qrUrl,
        ),
      ).toBe(true);
    });
    expect(getAdminDonation).toHaveBeenCalledTimes(2);
    expect(
      screen.getByText(textos.ultimaActualizacion(textos.fechaCorta(26, 'nov', 2026))),
    ).toBeTruthy();
  });

  it('tras subir el QR vuelve a pedir el GET admin y muestra el qrUrl nuevo', async () => {
    const renovada: AdminDonation = {
      ...donation,
      qrUrl: 'https://sitio.example/qr-subido.png',
      actualizadoEn: '2026-11-26T18:00:00.000Z',
    };
    vi.mocked(getAdminDonation).mockResolvedValueOnce(donation).mockResolvedValueOnce(renovada);
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    await elegirQr();
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    await waitFor(() => {
      expect(
        [...document.querySelectorAll('img')].some(
          (img) => img.getAttribute('src') === renovada.qrUrl,
        ),
      ).toBe(true);
    });
    expect(getAdminDonation).toHaveBeenCalledTimes(2);
    expect(uploadDonationQr).toHaveBeenCalledTimes(1);
  });

  it('al ocultar la donación no vuelve a pedir el GET admin', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    fireEvent.click(screen.getByRole('switch', { name: new RegExp(textos.mostrar) }));
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));

    await waitFor(() => {
      expect(saveAdminDonation).toHaveBeenCalled();
    });
    expect(getAdminDonation).toHaveBeenCalledTimes(1);
  });

  it('cierra el aviso de éxito y lo quita al volver a editar, sin perder role=status', async () => {
    renderPanel();
    await screen.findByDisplayValue(donation.titular);
    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));

    const aviso = (await screen.findByText(supuestos.guardado)).closest('[role="status"]');
    expect(aviso?.className).toContain('aviso-exito-entrar');
    fireEvent.click(screen.getByRole('button', { name: textos.cerrarAviso }));
    expect(aviso?.className).toContain('aviso-exito-salir');
    expect(aviso?.getAttribute('role')).toBe('status');
    await waitFor(() => {
      expect(screen.queryByText(supuestos.guardado)).toBeNull();
    });

    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    expect(await screen.findByText(supuestos.guardado)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(textos.titular), { target: { value: 'Otro titular' } });
    await waitFor(() => {
      expect(screen.queryByText(supuestos.guardado)).toBeNull();
    });
  });

  it('el aviso de éxito dura 5 segundos y un guardado nuevo reinicia el tiempo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderPanel();
      await screen.findByDisplayValue(donation.titular);
      fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
      expect(await screen.findByText(supuestos.guardado)).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_EXITO_MS - 1);
      });
      expect(screen.getByText(supuestos.guardado)).toBeTruthy();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.getByText(supuestos.guardado).closest('[role="status"]')?.className).toContain(
        'aviso-exito-salir',
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_SALIDA_MS);
      });
      expect(screen.queryByText(supuestos.guardado)).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText(supuestos.guardado)).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_EXITO_MS - 1);
      });
      expect(screen.getByText(supuestos.guardado)).toBeTruthy();

      fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByText(supuestos.guardado)).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_EXITO_MS - 1);
      });
      expect(screen.getByText(supuestos.guardado)).toBeTruthy();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.getByText(supuestos.guardado).closest('[role="status"]')?.className).toContain(
        'aviso-exito-salir',
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_SALIDA_MS);
      });
      expect(screen.queryByText(supuestos.guardado)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('al desmontar cancela el temporizador del aviso', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const limpiar = vi.spyOn(window, 'clearTimeout');
    try {
      const { unmount } = render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <AdminDonationPanel csrfToken="csrf" />
        </QueryClientProvider>,
      );
      await screen.findByDisplayValue(donation.titular);
      fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
      expect(await screen.findByText(supuestos.guardado)).toBeTruthy();
      const antes = limpiar.mock.calls.length;
      unmount();
      expect(limpiar.mock.calls.length).toBeGreaterThan(antes);
    } finally {
      limpiar.mockRestore();
      vi.useRealTimers();
    }
  });

  it('los errores no desaparecen solos', async () => {
    vi.mocked(saveAdminDonation).mockRejectedValue(new Error('fallo de red'));
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderPanel();
      await screen.findByDisplayValue(donation.titular);
      fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
      expect((await screen.findByRole('alert')).textContent).toContain('fallo de red');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(AVISO_EXITO_MS * 2);
      });
      expect(screen.getByRole('alert').textContent).toContain('fallo de red');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('AdminDonationPanel en móvil y escritorio', () => {
  it.each([false, true])('renderiza un solo formulario (móvil=%s)', async (movil) => {
    vista.movil = movil;
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    expect(document.querySelectorAll('form')).toHaveLength(1);
    expect(screen.getAllByLabelText(textos.titular)).toHaveLength(1);
    expect(screen.getAllByLabelText(textos.telefono)).toHaveLength(1);
  });

  it('en escritorio la previa queda al lado y no usa las secciones móviles', async () => {
    vista.movil = false;
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    expect(screen.getByText(textos.subtitulo)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: textos.avisoSeccion })).toBeNull();
    expect(document.querySelector('aside')?.className).toContain('border-l');
    expect(screen.getByLabelText(textos.telefono).getAttribute('inputmode')).toBeNull();
  });

  it('en móvil apila las secciones del frame y deja los botones al final', async () => {
    vista.movil = true;
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    expect(
      screen.getAllByRole('heading').map((titulo) => titulo.textContent),
    ).toEqual([
      textos.titulo,
      textos.cuenta,
      textos.codigoQr,
      textos.avisoSeccion,
      textos.vistaSeccion,
    ]);
    expect(screen.getByText(textos.subtituloMovil)).toBeTruthy();
    expect(screen.getByText(textos.cuentaNotaMovil)).toBeTruthy();
    expect(screen.getByText(textos.qrSeccionNota)).toBeTruthy();
    expect(screen.getByText(textos.imagenQr)).toBeTruthy();
    expect(screen.getByText(textos.avisoSeccionNota)).toBeTruthy();
    expect(screen.getByText(textos.vistaNotaMovil)).toBeTruthy();
    expect(screen.queryByText(textos.vistaTitulo)).toBeNull();

    const previa = screen.getByRole('heading', { name: textos.vistaSeccion });
    const guardar = screen.getByRole('button', { name: textos.guardar });
    const actualizar = screen.getByText(
      textos.ultimaActualizacion(textos.fechaCorta(3, 'nov', 2026)),
    );
    expect(previa.compareDocumentPosition(guardar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(guardar.compareDocumentPosition(actualizar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const telefono = screen.getByLabelText(textos.telefono);
    expect(telefono.getAttribute('inputmode')).toBe('tel');
    expect(telefono.className).toContain('text-base');
    expect(document.querySelector('aside')?.className).not.toContain('border-l');
  });

  it.each([false, true])('guarda, descarta, marca vigencia y el cartel de demostración (móvil=%s)', async (movil) => {
    vista.movil = movil;
    renderPanel();
    await screen.findByDisplayValue(donation.titular);

    fireEvent.click(screen.getByRole('button', { name: textos.guardar }));
    await waitFor(() => {
      expect(saveAdminDonation).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true, qrVenceEl: donation.qr.venceEl }),
        'csrf',
      );
    });
    expect(await screen.findByText(supuestos.guardado)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(textos.titular), { target: { value: 'Otro titular' } });
    fireEvent.click(screen.getByRole('button', { name: textos.descartar }));
    const dialogo = screen.getByRole('dialog', { name: supuestos.descartarTitulo });
    expect(dialogo).toBeTruthy();
    if (movil) {
      expect(dialogo.className).toContain('w-full');
      expect(dialogo.className).not.toContain('size-modal-admin');
      expect(screen.getByRole('button', { name: supuestos.confirmar }).className).toContain('w-full');
      expect(screen.getByRole('button', { name: supuestos.cancelar }).className).toContain('w-full');
    }
    fireEvent.click(screen.getByRole('button', { name: supuestos.confirmar }));
    expect((screen.getByLabelText(textos.titular) as HTMLInputElement).value).toBe(donation.titular);

    fireEvent.change(screen.getByLabelText(textos.vence), { target: { value: '2000-01-01' } });
    expect(screen.getAllByText(textos.vencido).length).toBeGreaterThan(1);
    expect(screen.getByText(textos.cajaQrPublica)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(textos.titular), {
      target: { value: 'DEMO - NO REALIZAR DONACIONES' },
    });
    expect(screen.getByText(textos.demoAviso)).toBeTruthy();
  });
});
