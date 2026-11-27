import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enviarArchivo, enviarJson, pedirJson } from '@/services/admin/cliente-admin'
import { actualizarContenido, listarContenido, reemplazarImagenContenido } from './contenido.service'

vi.mock('@/services/admin/cliente-admin', () => ({
  enviarArchivo: vi.fn(),
  enviarJson: vi.fn(),
  pedirJson: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(enviarArchivo).mockReset()
})

describe('listarContenido', () => {
  it('pide el listado administrativo', async () => {
    vi.mocked(pedirJson).mockResolvedValue([])
    await listarContenido()
    expect(pedirJson).toHaveBeenCalledWith('/admin/contenido')
  })
})

describe('actualizarContenido', () => {
  it('envía título, texto y visibilidad del bloque', async () => {
    const cuerpo = {
      textoEs: 'Texto',
      textoEn: 'Text',
      tituloEs: 'Título',
      tituloEn: 'Title',
      visible: true,
    }
    vi.mocked(enviarJson).mockResolvedValue({ clave: 'hero_principal' })
    await actualizarContenido('hero_principal', cuerpo)
    expect(enviarJson).toHaveBeenCalledWith(
      'PUT',
      '/admin/contenido/hero_principal',
      cuerpo,
    )
  })
})

describe('reemplazarImagenContenido', () => {
  it('envía el archivo al endpoint del bloque', async () => {
    const archivo = new File(['foto'], 'hero.png', { type: 'image/png' })
    vi.mocked(enviarArchivo).mockResolvedValue({ clave: 'hero_principal' })

    await reemplazarImagenContenido('hero_principal', archivo)

    expect(enviarArchivo).toHaveBeenCalledWith(
      '/admin/contenido/hero_principal/imagen',
      archivo,
    )
  })
})
