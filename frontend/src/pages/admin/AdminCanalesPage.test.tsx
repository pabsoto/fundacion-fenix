import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminCanalesPage } from './AdminCanalesPage'
import {
  actualizarUrlFacebook,
  getCanalFacebook,
} from '@/services/admin/canales.service'

const canal = {
  tipo: 'facebook' as const,
  url: 'https://www.facebook.com/actual',
  textoEs: null,
  textoEn: null,
  orden: 1,
  activo: true,
  actualizadoEn: '2026-01-01T00:00:00.000Z',
}

vi.mock('@/services/admin/canales.service', () => ({
  actualizarUrlFacebook: vi.fn(),
  getCanalFacebook: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getCanalFacebook).mockResolvedValue(canal)
  vi.mocked(actualizarUrlFacebook).mockImplementation(async (_canal, url) => ({
    ...canal,
    url,
  }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminCanalesPage />
    </QueryClientProvider>,
  )
}

describe('AdminCanalesPage', () => {
  it('carga y guarda la URL Facebook usando el canal que gestiona el panel', async () => {
    renderPage()

    const campo = await screen.findByLabelText('URL de la página oficial de Facebook')
    expect((campo as HTMLInputElement).value).toBe(canal.url)
    fireEvent.change(campo, { target: { value: 'https://www.facebook.com/actualizada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar URL' }))

    await waitFor(() =>
      expect(actualizarUrlFacebook).toHaveBeenCalledWith(
        canal,
        'https://www.facebook.com/actualizada',
      ),
    )
    expect(await screen.findByText('La URL oficial de Facebook se guardó correctamente.')).toBeTruthy()
  })

  it('rechaza una URL que no pertenece a Facebook antes de llamar al API', async () => {
    renderPage()

    const campo = await screen.findByLabelText('URL de la página oficial de Facebook')
    fireEvent.change(campo, { target: { value: 'https://example.org/fundacion' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar URL' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Escribe una URL HTTPS válida de Facebook.',
    )
    expect(actualizarUrlFacebook).not.toHaveBeenCalled()
  })
})
