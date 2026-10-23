import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPublicContacts, isValidWhatsAppUrl } from './contacts.service'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getPublicContacts', () => {
  it('consulta el endpoint público y conserva su contrato', async () => {
    const contacts = [
      {
        tipo: 'whatsapp',
        url: 'https://wa.me/59170000000',
        texto: { es: 'Escríbenos', en: 'Message us' },
        orden: 1,
      },
    ]
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(contacts), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getPublicContacts()).resolves.toEqual(contacts)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/public/contactos', {
      headers: { Accept: 'application/json' },
    })
  })

  it('propaga un error controlado cuando la API falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    await expect(getPublicContacts()).rejects.toThrow('No se pudieron obtener los contactos (503)')
  })
})

describe('isValidWhatsAppUrl', () => {
  it.each([
    'https://wa.me/59170000000',
    'https://wa.link/abc123',
    'https://api.whatsapp.com/send?phone=59170000000',
  ])('acepta una URL oficial de WhatsApp: %s', (url) => {
    expect(isValidWhatsAppUrl(url)).toBe(true)
  })

  it.each([
    'not-a-url',
    'http://wa.me/59170000000',
    'https://example.com/59170000000',
    'javascript:alert(1)',
  ])('rechaza una URL inválida o ajena a WhatsApp: %s', (url) => {
    expect(isValidWhatsAppUrl(url)).toBe(false)
  })
})
