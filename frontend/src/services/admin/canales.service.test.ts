import { afterEach, describe, expect, it, vi } from 'vitest'
import { fijarCsrfAdmin } from '@/services/admin/cliente-admin'
import { actualizarCanal, actualizarUrlFacebook, getCanalFacebook } from './canales.service'

const canal = {
  tipo: 'facebook' as const,
  url: 'https://www.facebook.com/antigua',
  textoEs: 'Facebook',
  textoEn: 'Facebook',
  orden: 2,
  activo: true,
  actualizadoEn: '2026-01-01T00:00:00.000Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
  fijarCsrfAdmin(null)
})

describe('servicio de canales admin', () => {
  it('obtiene desde el API el canal Facebook editable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify([canal]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(getCanalFacebook()).resolves.toEqual(canal)
  })

  it('actualiza la URL conservando textos y estado e incluye CSRF', async () => {
    fijarCsrfAdmin('token-csrf')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...canal, url: 'https://www.facebook.com/nueva' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await actualizarUrlFacebook(canal, 'https://www.facebook.com/nueva')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/canales/facebook',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({
          url: 'https://www.facebook.com/nueva',
          textoEs: 'Facebook',
          textoEn: 'Facebook',
          activo: true,
        }),
      }),
    )
    expect(new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('X-CSRF-Token')).toBe(
      'token-csrf',
    )
  })

  it('actualiza un canal reenviando el texto en inglés y el estado', async () => {
    const whatsapp = {
      tipo: 'whatsapp' as const,
      url: 'https://wa.me/59170000000',
      textoEs: 'Hola',
      textoEn: 'Hi',
      orden: 1,
      activo: false,
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    }
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...whatsapp, url: 'https://wa.me/59171111111' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await actualizarCanal(whatsapp, {
      url: 'https://wa.me/59171111111',
      textoEs: '¿Hablamos?',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/admin/canales/whatsapp',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({
          url: 'https://wa.me/59171111111',
          textoEs: '¿Hablamos?',
          textoEn: 'Hi',
          activo: false,
        }),
      }),
    )
  })
})
