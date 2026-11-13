import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import i18n from '@/i18n'
import { GaleriaFotos } from './GaleriaFotos'

const ALT = (numero: number) => `Jornada foto ${numero}`
const ampliar = (numero: number, total: number) => `Ampliar foto ${numero} de ${total}`

function galeria(fotos: string[]) {
  return <GaleriaFotos fotos={fotos} textoAlt={ALT} textoPendiente="Foto" />
}

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
  sessionStorage.clear()
  void i18n.changeLanguage('es')
})

describe('GaleriaFotos', () => {
  it('sin fotos muestra los tres recuadros grises y ninguna flecha', async () => {
    await i18n.changeLanguage('es')
    render(galeria([]))

    expect(screen.getAllByText('Foto')).toHaveLength(3)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con 1 y con 3 fotos queda estática, sin flechas', async () => {
    await i18n.changeLanguage('es')
    const { rerender } = render(galeria(['/demo/foto-horizontal.png']))

    expect(screen.getByRole('button', { name: ampliar(1, 1) })).toBeTruthy()
    expect(screen.getAllByText('Foto')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Foto anterior' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Foto siguiente' })).toBeNull()

    rerender(
      galeria([
        '/demo/foto-horizontal.png',
        '/demo/foto-vertical.png',
        '/demo/foto-horizontal.png',
      ])
    )

    expect(screen.getAllByRole('button')).toHaveLength(3)
    expect(screen.queryByText('Foto')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Foto anterior' })).toBeNull()
  })

  it('con más de 3 fotos muestra las flechas del carrusel', async () => {
    await i18n.changeLanguage('es')
    render(
      galeria([
        '/demo/foto-horizontal.png',
        '/demo/foto-vertical.png',
        '/demo/foto-horizontal.png',
        '/demo/foto-vertical.png',
        '/demo/foto-horizontal.png',
      ])
    )

    expect(screen.getByRole('button', { name: 'Foto anterior' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Foto siguiente' })).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /Ampliar foto/ })).toHaveLength(5)
  })

  it('el clic abre el visor en esa foto, las flechas del teclado cambian y Esc devuelve el foco', async () => {
    await i18n.changeLanguage('es')
    render(
      galeria([
        '/a.png',
        '/b.png',
        '/c.png',
        '/d.png',
        '/e.png',
      ])
    )

    const tercera = screen.getByRole('button', { name: ampliar(3, 5) })
    tercera.focus()
    fireEvent.click(tercera)

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.className).toContain('galeria-visor')
    expect(within(dialog).getByText('3 de 5')).toBeTruthy()
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(within(dialog).getByText('4 de 5')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(within(dialog).getByText('3 de 5')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    expect(document.activeElement).toBe(tercera)
    expect(document.body.style.overflow).toBe('')
  })

  it('una sola foto abre el visor sin flechas', async () => {
    await i18n.changeLanguage('es')
    render(galeria(['/demo/foto-vertical.png']))

    fireEvent.click(screen.getByRole('button', { name: ampliar(1, 1) }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('1 de 1')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Foto anterior' })).toBeNull()
    expect(within(dialog).queryByRole('button', { name: 'Foto siguiente' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Cerrar' })).toBeTruthy()
  })

  it('el clic en el fondo cierra el visor y una imagen rota muestra el fallback', async () => {
    await i18n.changeLanguage('es')
    render(galeria(['/demo/no-existe.png']))

    fireEvent.click(screen.getByRole('button', { name: ampliar(1, 1) }))
    const dialog = screen.getByRole('dialog')
    const imagen = within(dialog).getByRole('img', { name: 'Jornada foto 1' })
    fireEvent.error(imagen)

    expect(within(dialog).getByRole('img', { name: 'Jornada foto 1' }).tagName).not.toBe('IMG')
    expect(within(dialog).getByText('Jornada foto 1')).toBeTruthy()

    fireEvent.click(dialog)
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
  })
})
