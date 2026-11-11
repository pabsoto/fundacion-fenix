import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ContactFooter } from './ContactFooter'

const contacts = [
  {
    tipo: 'facebook',
    url: 'https://facebook.com/fundacionfenix',
    texto: { es: 'Facebook', en: 'Facebook' },
    orden: 1,
  },
  {
    tipo: 'instagram',
    url: 'https://instagram.com/fundacionfenix',
    texto: { es: 'Instagram', en: 'Instagram' },
    orden: 2,
  },
  {
    tipo: 'tiktok',
    url: 'https://tiktok.com/@fundacionfenix',
    texto: { es: 'TikTok', en: 'TikTok' },
    orden: 3,
  },
  {
    tipo: 'whatsapp',
    url: 'https://wa.me/59170000000',
    texto: { es: 'WhatsApp', en: 'WhatsApp' },
    orden: 4,
  },
]

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ContactFooter', () => {
  it('enlaza las redes y WhatsApp a los destinos públicos con apertura segura', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      const body = url.endsWith('/public/contactos') ? contacts : []
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <ContactFooter />
      </QueryClientProvider>,
    )

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    for (const contact of contacts) {
      const link = await screen.findByRole('link', {
        name: new RegExp(contact.tipo, 'i'),
      })
      expect(link.getAttribute('href')).toBe(contact.url)
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    }
  })
})
