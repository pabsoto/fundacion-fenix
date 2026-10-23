import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton'

const ariaLabel = 'Contactar a Fundación FÉNIX LPB por WhatsApp'

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <WhatsAppFloatingButton />
    </QueryClientProvider>,
  )
}

function mockContacts(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('WhatsAppFloatingButton', () => {
  it('muestra el enlace activo entregado por la API en el layout público', async () => {
    const url = 'https://wa.me/59170000000?text=Hola'
    mockContacts([
      {
        tipo: 'instagram',
        url: 'https://instagram.com/fenix',
        texto: { es: 'Instagram', en: 'Instagram' },
        orden: 1,
      },
      {
        tipo: 'whatsapp',
        url,
        texto: { es: 'Escríbenos', en: 'Message us' },
        orden: 2,
      },
    ])

    renderButton()

    expect(screen.queryByRole('link', { name: ariaLabel })).toBeNull()
    const link = await screen.findByRole('link', { name: ariaLabel })
    expect(link.getAttribute('href')).toBe(url)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link.querySelector('.wa-float__tooltip')?.textContent).toBe('Escríbenos')
    expect(link.parentElement).toBe(document.body)
  })

  it.each([
    ['sin WhatsApp activo', []],
    [
      'con URL inválida',
      [
        {
          tipo: 'whatsapp',
          url: 'https://example.com/contacto',
          texto: { es: null, en: null },
          orden: 1,
        },
      ],
    ],
  ])('no muestra el botón %s', async (_scenario, response) => {
    const fetchMock = mockContacts(response)
    renderButton()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(screen.queryByRole('link', { name: ariaLabel })).toBeNull()
  })

  it('no muestra un enlace cuando falla la API', async () => {
    const fetchMock = mockContacts({ message: 'Servicio no disponible' }, 503)
    renderButton()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(screen.queryByRole('link', { name: ariaLabel })).toBeNull()
  })
})
