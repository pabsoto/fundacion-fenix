import { describe, expect, it } from 'vitest'
import { validarHistoria, type FormularioHistoria } from '@/schemas/historia'

function base(parcial: Partial<FormularioHistoria> = {}): FormularioHistoria {
  return {
    animalNombre: 'Luna',
    tituloEs: 'Luna encontró un hogar',
    tituloEn: 'Luna found a home',
    textoEs: 'Texto de la historia.',
    textoEn: 'Story text.',
    autorNombre: '',
    fechaHistoria: '2026-03-08',
    visible: false,
    foto: null,
    ...parcial,
  }
}

describe('validarHistoria', () => {
  it('exige los textos y la fecha, y deja el autor vacío en null', () => {
    const vacio = validarHistoria(
      base({ animalNombre: '  ', tituloEs: '', fechaHistoria: '' }),
      false,
    )
    expect(vacio.ok).toBe(false)
    if (vacio.ok) return
    expect(vacio.errores.animalNombre).toBe('Completa este campo.')
    expect(vacio.errores.tituloEs).toBe('Completa este campo.')
    expect(vacio.errores.fechaHistoria).toBe('Completa este campo.')

    const ok = validarHistoria(base(), false)
    expect(ok.ok).toBe(true)
    if (!ok.ok) return
    expect(ok.datos.autorNombre).toBeNull()
    expect(ok.datos.animalNombre).toBe('Luna')
  })

  it('rechaza una fecha imposible y un título demasiado largo', () => {
    const fecha = validarHistoria(base({ fechaHistoria: '2026-02-31' }), false)
    expect(fecha.ok).toBe(false)
    if (fecha.ok) return
    expect(fecha.errores.fechaHistoria).toBe('La fecha debe tener el formato AAAA-MM-DD.')

    const largo = validarHistoria(base({ tituloEn: 'x'.repeat(201) }), false)
    expect(largo.ok).toBe(false)
    if (largo.ok) return
    expect(largo.errores.tituloEn).toBe('El título admite hasta 200 caracteres.')
  })

  it('exige foto para publicar si todavía no hay una guardada', () => {
    const sinFoto = validarHistoria(base({ visible: true }), false)
    expect(sinFoto.ok).toBe(false)
    if (sinFoto.ok) return
    expect(sinFoto.errores.foto).toBe('Para mostrarla en el sitio hace falta una foto.')

    const conGuardada = validarHistoria(base({ visible: true }), true)
    expect(conGuardada.ok).toBe(true)
  })

  it('rechaza un archivo que no es imagen o que supera 5 MB', () => {
    const gif = new File(['gif'], 'dibujo.gif', { type: 'image/gif' })
    const tipo = validarHistoria(base({ foto: gif }), false)
    expect(tipo.ok).toBe(false)
    if (tipo.ok) return
    expect(tipo.errores.foto).toBe('La imagen debe ser JPG, PNG o WebP de hasta 5 MB.')

    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.jpg', {
      type: 'image/jpeg',
    })
    const peso = validarHistoria(base({ foto: grande }), false)
    expect(peso.ok).toBe(false)
  })
})
