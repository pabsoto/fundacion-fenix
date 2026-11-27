import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fijarCsrfAdmin } from '@/services/admin/cliente-admin'
import {
  eliminarHistoria,
  guardarHistoria,
  reintentarFotoHistoria,
  reordenarHistorias,
  type GuardarHistoria,
  type HistoriaAdmin,
} from '@/services/admin/historias.service'

vi.mock('@/lib/demo', () => ({ DEMO_SHOWCASE: false }))

const fetchMock = vi.fn()

function respuesta(cuerpo: unknown, estado = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

function historia(parcial: Partial<HistoriaAdmin> = {}): HistoriaAdmin {
  return {
    id: 'h1',
    animalNombre: 'Luna',
    tituloEs: 'Luna encontró un hogar',
    tituloEn: 'Luna found a home',
    textoEs: 'Texto de la historia.',
    textoEn: 'Story text.',
    autorNombre: null,
    fechaHistoria: '2026-03-08',
    orden: 1,
    visible: false,
    foto: null,
    creadoEn: '2026-11-26T15:00:00.000Z',
    actualizadoEn: '2026-11-26T15:00:00.000Z',
    ...parcial,
  }
}

const entrada: GuardarHistoria = {
  animalNombre: 'Luna',
  tituloEs: 'Luna encontró un hogar',
  tituloEn: 'Luna found a home',
  textoEs: 'Texto de la historia.',
  textoEn: 'Story text.',
  autorNombre: null,
  fechaHistoria: '2026-03-08',
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fijarCsrfAdmin('token-csrf')
})

afterEach(() => {
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

describe('historias del panel', () => {
  it('crea la historia, sube la foto después y solo entonces la publica', async () => {
    const creada = historia()
    const conFoto = historia({
      foto: { url: 'https://cdn.test/luna.jpg', ancho: 800, alto: 1600 },
    })
    const publicada = historia({ ...conFoto, visible: true })
    fetchMock
      .mockResolvedValueOnce(respuesta(creada, 201))
      .mockResolvedValueOnce(respuesta(conFoto, 201))
      .mockResolvedValueOnce(respuesta(publicada))

    const archivo = new File(['jpg'], 'vertical.jpg', { type: 'image/jpeg' })
    const resultado = await guardarHistoria({
      entrada,
      visible: true,
      foto: archivo,
      tieneFoto: false,
    })

    expect(resultado.archivoPendiente).toBeNull()
    expect(resultado.historia?.visible).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    const [urlCrear, initCrear] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(urlCrear).toBe('http://localhost:3000/api/admin/historias')
    expect(initCrear.method).toBe('POST')
    const cuerpo = JSON.parse(String(initCrear.body)) as Record<string, unknown>
    expect(cuerpo).toEqual(entrada)
    expect(cuerpo).not.toHaveProperty('visible')
    expect(cuerpo).not.toHaveProperty('ancho')
    expect(cuerpo).not.toHaveProperty('alto')

    const [urlFoto, initFoto] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(urlFoto).toBe('http://localhost:3000/api/admin/historias/h1/foto')
    expect(initFoto.body).toBeInstanceOf(FormData)
    expect((initFoto.body as FormData).get('archivo')).toBe(archivo)
    expect((initFoto.body as FormData).get('ancho')).toBeNull()

    const [urlPublicar, initPublicar] = fetchMock.mock.calls[2] as [string, RequestInit]
    expect(urlPublicar).toBe('http://localhost:3000/api/admin/historias/h1')
    expect(initPublicar.method).toBe('PUT')
    expect(JSON.parse(String(initPublicar.body)).visible).toBe(true)
  })

  it('si la foto falla, no vuelve a crear la historia y deja el archivo para reintentar', async () => {
    fetchMock
      .mockResolvedValueOnce(respuesta(historia(), 201))
      .mockResolvedValueOnce(respuesta({ message: 'Storage no disponible' }, 503))

    const archivo = new File(['jpg'], 'luna.jpg', { type: 'image/jpeg' })
    const resultado = await guardarHistoria({
      entrada,
      visible: true,
      foto: archivo,
      tieneFoto: false,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resultado.historia?.id).toBe('h1')
    expect(resultado.archivoPendiente).toBe(archivo)
    expect(resultado.publicarPendiente).toBe(true)

    fetchMock.mockReset()
    fetchMock
      .mockResolvedValueOnce(
        respuesta(
          historia({ foto: { url: 'https://cdn.test/luna.jpg', ancho: 800, alto: 1600 } }),
          201,
        ),
      )
      .mockResolvedValueOnce(
        respuesta(
          historia({
            visible: true,
            foto: { url: 'https://cdn.test/luna.jpg', ancho: 800, alto: 1600 },
          }),
        ),
      )

    const reintento = await reintentarFotoHistoria({
      id: 'h1',
      entrada,
      archivo,
      publicar: true,
    })
    expect(reintento.archivoPendiente).toBeNull()
    expect(reintento.publicarPendiente).toBe(false)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3000/api/admin/historias/h1/foto')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'PUT' })
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toBe(
      'http://localhost:3000/api/admin/historias',
    )
  })

  it('reordena con la lista completa y borra con DELETE', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta([historia({ id: 'b', orden: 1 }), historia({ id: 'a', orden: 2 })]),
    )
    const lista = await reordenarHistorias(['b', 'a'])
    expect(lista.map((item) => item.id)).toEqual(['b', 'a'])
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1].body))).toEqual({ ids: ['b', 'a'] })

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    await eliminarHistoria('h1')
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3000/api/admin/historias/h1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})
