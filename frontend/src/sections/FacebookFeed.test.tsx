import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { FacebookFeed } from './FacebookFeed'
import { isValidFacebookPageUrl } from '@/services/contacts.service'

const pagina = 'https://www.facebook.com/fundacionfenixlpb'
let anchoContenedor = 320
let actualizarObservador: ((ancho: number) => void) | undefined

class ResizeObserverPrueba implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {
    actualizarObservador = (ancho) => {
      this.callback(
        [{ contentRect: { width: ancho } } as ResizeObserverEntry],
        this,
      )
    }
  }

  observe() {
    actualizarObservador?.(anchoContenedor)
  }

  unobserve() {}

  disconnect() {}
}

function renderFeed(contactos: unknown[] = [{
  tipo: 'facebook',
  url: pagina,
  texto: { es: null, en: null },
  orden: 1,
}]) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(contactos), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <FacebookFeed />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  actualizarObservador = undefined
  anchoContenedor = 320
})

describe('FacebookFeed', () => {
  it('usa la URL configurada y conserva un enlace externo de respaldo', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverPrueba)
    renderFeed()

    const iframe = await screen.findByTitle(
      "Recent posts from the foundation's Facebook Page",
    )
    await waitFor(() => {
      const fuente = new URL(iframe.getAttribute('src') ?? '')
      expect(fuente.searchParams.get('href')).toBe(pagina)
      expect(fuente.searchParams.get('tabs')).toBe('timeline')
      expect(fuente.searchParams.get('width')).toBe('320')
    })

    const enlace = screen.getByRole('link', { name: 'View on Facebook' })
    expect(enlace.getAttribute('href')).toBe(pagina)
    expect(enlace.getAttribute('target')).toBe('_blank')
    expect(enlace.getAttribute('rel')).toBe('noopener noreferrer')
    expect(iframe.getAttribute('loading')).toBe('lazy')
    expect(iframe.style.minWidth).toBe('180px')
    expect(iframe.style.maxWidth).toBe('500px')
  })

  it('ajusta el ancho al contenedor entre los límites oficiales', async () => {
    vi.stubGlobal('ResizeObserver', ResizeObserverPrueba)
    renderFeed()
    const iframe = await screen.findByTitle(
      "Recent posts from the foundation's Facebook Page",
    )

    anchoContenedor = 800
    actualizarObservador?.(anchoContenedor)
    await waitFor(() =>
      expect(new URL(iframe.getAttribute('src') ?? '').searchParams.get('width')).toBe('500'),
    )

    anchoContenedor = 120
    actualizarObservador?.(anchoContenedor)
    await waitFor(() =>
      expect(new URL(iframe.getAttribute('src') ?? '').searchParams.get('width')).toBe('180'),
    )
  })

  it('no crea un iframe ni inventa un destino si falta el canal', async () => {
    renderFeed([])

    expect(
      await screen.findByText('The official Facebook Page has not been configured yet.'),
    ).toBeTruthy()
    expect(screen.queryByTitle(/Facebook Page/)).toBeNull()
    expect(screen.queryByRole('link', { name: 'View on Facebook' })).toBeNull()
  })

  it('mantiene visible el respaldo aunque el iframe permanezca bloqueado', async () => {
    renderFeed()

    expect(await screen.findByRole('link', { name: 'View on Facebook' })).toBeTruthy()
  })
})

describe('isValidFacebookPageUrl', () => {
  it.each([
    'https://www.facebook.com/fundacionfenixlpb',
    'https://facebook.com/fundacionfenixlpb',
    'https://m.facebook.com/fundacionfenixlpb',
  ])('acepta una URL pública de Facebook: %s', (url) => {
    expect(isValidFacebookPageUrl(url)).toBe(true)
  })

  it.each([
    'not-a-url',
    'http://www.facebook.com/fundacionfenixlpb',
    'https://facebook.com.example.org/fundacionfenixlpb',
    'https://example.org/fundacionfenixlpb',
    'https://user@www.facebook.com/fundacionfenixlpb',
  ])('rechaza una URL que no sea una página HTTPS de Facebook: %s', (url) => {
    expect(isValidFacebookPageUrl(url)).toBe(false)
  })
})
