import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PanelHistorias } from '@/components/admin/PanelHistorias'
import {
  actualizarHistoria,
  eliminarHistoria,
  guardarHistoria,
  listarHistorias,
  reintentarFotoHistoria,
  reordenarHistorias,
  type HistoriaAdmin,
} from '@/services/admin/historias.service'

vi.mock('@/services/admin/historias.service', () => ({
  listarHistorias: vi.fn(),
  guardarHistoria: vi.fn(),
  reintentarFotoHistoria: vi.fn(),
  actualizarHistoria: vi.fn(),
  eliminarHistoria: vi.fn(),
  reordenarHistorias: vi.fn(),
}))

vi.mock('@/lib/medir-foto', () => ({
  medirFoto: vi.fn(async (archivo: File) => {
    if (archivo.name.includes('vertical')) return { ancho: 800, alto: 1600 }
    return { ancho: 1600, alto: 900 }
  }),
}))

function historia(parcial: Partial<HistoriaAdmin> = {}): HistoriaAdmin {
  return {
    id: 'h1',
    animalNombre: 'Luna',
    tituloEs: 'Luna encontró un hogar',
    tituloEn: 'Luna found a home',
    textoEs: 'Texto de la historia.',
    textoEn: 'Story text.',
    autorNombre: 'Familia Quispe',
    fechaHistoria: '2026-03-08',
    orden: 1,
    visible: true,
    foto: { url: 'https://cdn.test/luna.jpg', ancho: 1600, alto: 900 },
    creadoEn: '2026-11-26T15:00:00.000Z',
    actualizadoEn: '2026-11-26T15:00:00.000Z',
    ...parcial,
  }
}

const luna = historia()
const max = historia({
  id: 'h2',
  animalNombre: 'Max',
  tituloEs: 'Max sigue en casa',
  tituloEn: 'Max is still home',
  orden: 2,
  visible: false,
  foto: null,
  autorNombre: null,
})

function llenar(valores: {
  animal?: string
  titulo?: string
  title?: string
  texto?: string
  text?: string
  fecha?: string
}) {
  fireEvent.change(screen.getByLabelText('Nombre del animal *'), {
    target: { value: valores.animal ?? 'Luna' },
  })
  fireEvent.change(screen.getByLabelText('Título *'), {
    target: { value: valores.titulo ?? 'Luna encontró un hogar' },
  })
  fireEvent.change(screen.getByLabelText('Title *'), {
    target: { value: valores.title ?? 'Luna found a home' },
  })
  fireEvent.change(screen.getByLabelText('Texto *'), {
    target: { value: valores.texto ?? 'Texto de la historia.' },
  })
  fireEvent.change(screen.getByLabelText('Text *'), {
    target: { value: valores.text ?? 'Story text.' },
  })
  fireEvent.change(screen.getByLabelText('Fecha de la historia *'), {
    target: { value: valores.fecha ?? '2026-03-08' },
  })
}

beforeEach(() => {
  vi.mocked(listarHistorias).mockResolvedValue([luna, max])
  vi.mocked(guardarHistoria).mockResolvedValue({
    historia: luna,
    archivoPendiente: null,
    publicarPendiente: false,
  })
  vi.mocked(actualizarHistoria).mockResolvedValue({ ...luna, visible: false })
  vi.mocked(eliminarHistoria).mockResolvedValue(undefined)
  vi.mocked(reordenarHistorias).mockImplementation(async (ids: string[]) =>
    ids.map((id) => (id === 'h2' ? max : luna)),
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PanelHistorias', () => {
  it('muestra el vacío y el error con reintento', async () => {
    vi.mocked(listarHistorias).mockResolvedValueOnce([])
    render(<PanelHistorias />)
    expect(screen.getByText('Cargando…')).toBeTruthy()
    expect(await screen.findByText('Aún no hay historias')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Nueva historia' })).toBeTruthy()

    cleanup()
    vi.mocked(listarHistorias).mockRejectedValueOnce(new Error('red')).mockResolvedValueOnce([])
    render(<PanelHistorias />)
    expect(await screen.findByText('No se pudieron cargar los datos.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Aún no hay historias')).toBeTruthy()
  })

  it('crea y edita una historia', async () => {
    render(<PanelHistorias />)
    await screen.findByText('Luna encontró un hogar')
    fireEvent.click(screen.getByRole('button', { name: 'Nueva historia' }))
    llenar({ titulo: 'Historia nueva' })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar historia' }))

    await waitFor(() => expect(guardarHistoria).toHaveBeenCalledTimes(1))
    expect(guardarHistoria).toHaveBeenCalledWith({
      id: undefined,
      entrada: {
        animalNombre: 'Luna',
        tituloEs: 'Historia nueva',
        tituloEn: 'Luna found a home',
        textoEs: 'Texto de la historia.',
        textoEn: 'Story text.',
        autorNombre: null,
        fechaHistoria: '2026-03-08',
      },
      visible: false,
      foto: null,
      tieneFoto: false,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Editar «Luna encontró un hogar»' }))
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Título editado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() => expect(guardarHistoria).toHaveBeenCalledTimes(2))
    expect(vi.mocked(guardarHistoria).mock.calls[1]?.[0]).toMatchObject({
      id: 'h1',
      tieneFoto: true,
      entrada: { tituloEs: 'Título editado' },
    })
  })

  it('oculta sin confirmación y elimina solo después de confirmar', async () => {
    render(<PanelHistorias />)
    await screen.findByText('Luna encontró un hogar')

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar «Luna encontró un hogar»' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(actualizarHistoria).toHaveBeenCalledTimes(1))
    expect(actualizarHistoria).toHaveBeenCalledWith(
      'h1',
      expect.objectContaining({ visible: false, tituloEs: 'Luna encontró un hogar' }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar «Max sigue en casa»' }))
    await waitFor(() => expect(actualizarHistoria).toHaveBeenCalledTimes(2))
    expect(vi.mocked(actualizarHistoria).mock.calls[1]?.[1]).toMatchObject({ visible: true })

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar «Max sigue en casa»' }))
    const dialogo = screen.getByRole('dialog', { name: 'Eliminar historia' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(eliminarHistoria).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar «Max sigue en casa»' }))
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar historia' }))
    await waitFor(() => expect(eliminarHistoria).toHaveBeenCalledWith('h2'))
  })

  it('reordena con subir y bajar', async () => {
    render(<PanelHistorias />)
    await screen.findByText('Luna encontró un hogar')
    expect(
      (screen.getByRole('button', { name: 'Subir «Luna encontró un hogar»' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Bajar «Max sigue en casa»' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Bajar «Luna encontró un hogar»' }))
    await waitFor(() => {
      expect(reordenarHistorias).toHaveBeenCalledWith(['h2', 'h1'])
      expect(
        (
          screen.getByRole('button', {
            name: 'Subir «Luna encontró un hogar»',
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Subir «Luna encontró un hogar»' }))
    await waitFor(() => expect(reordenarHistorias).toHaveBeenCalledWith(['h1', 'h2']))
  })

  it('no guarda si faltan obligatorios o la foto no es válida', async () => {
    render(<PanelHistorias />)
    await screen.findByRole('button', { name: 'Nueva historia' })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva historia' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar historia' }))
    expect((await screen.findAllByText('Completa este campo.')).length).toBeGreaterThan(0)
    expect(guardarHistoria).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('switch', { name: /Visible/ }))
    llenar({})
    fireEvent.click(screen.getByRole('button', { name: 'Guardar historia' }))
    expect(await screen.findByText('Para mostrarla en el sitio hace falta una foto.')).toBeTruthy()
    expect(guardarHistoria).not.toHaveBeenCalled()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['gif'], 'dibujo.gif', { type: 'image/gif' })] },
    })
    expect(
      await screen.findByText('La imagen debe ser JPG, PNG o WebP de hasta 5 MB.'),
    ).toBeTruthy()

    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.png', {
      type: 'image/png',
    })
    fireEvent.change(input, { target: { files: [grande] } })
    expect(
      screen.getAllByText('La imagen debe ser JPG, PNG o WebP de hasta 5 MB.').length,
    ).toBeGreaterThan(0)
    expect(guardarHistoria).not.toHaveBeenCalled()
  })

  it('actualiza la vista previa en español e inglés y encaja fotos verticales y horizontales', async () => {
    render(<PanelHistorias />)
    await screen.findByRole('button', { name: 'Nueva historia' })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva historia' }))
    llenar({ titulo: 'Título en vivo', title: 'Live title', animal: 'Luna' })
    fireEvent.change(screen.getByLabelText('Autor (opcional)'), { target: { value: 'Ana' } })

    const tarjeta = screen.getByRole('article')
    expect(within(tarjeta).getByRole('heading', { name: 'Título en vivo' })).toBeTruthy()
    expect(within(tarjeta).getByText('Por Ana')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(within(tarjeta).getByRole('heading', { name: 'Live title' })).toBeTruthy()
    expect(within(tarjeta).getByText('By Ana')).toBeTruthy()

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['jpg'], 'vertical.jpg', { type: 'image/jpeg' })] },
    })
    await waitFor(() => {
      const img = within(tarjeta).getByRole('img')
      expect(img.getAttribute('width')).toBe('800')
      expect(img.getAttribute('height')).toBe('1600')
      expect(img.className).toContain('object-contain')
    })

    fireEvent.change(input, {
      target: { files: [new File(['jpg'], 'horizontal.jpg', { type: 'image/jpeg' })] },
    })
    await waitFor(() => {
      const img = within(tarjeta).getByRole('img')
      expect(img.getAttribute('width')).toBe('1600')
      expect(img.getAttribute('height')).toBe('900')
      expect(img.className).toContain('object-contain')
    })
  })

  it('reintenta la foto sin volver a guardar la historia', async () => {
    const archivo = new File(['jpg'], 'luna.jpg', { type: 'image/jpeg' })
    vi.mocked(guardarHistoria).mockResolvedValueOnce({
      historia: luna,
      archivoPendiente: archivo,
      publicarPendiente: true,
    })
    vi.mocked(reintentarFotoHistoria).mockResolvedValueOnce({
      historia: { ...luna, visible: true },
      archivoPendiente: null,
      publicarPendiente: false,
    })

    render(<PanelHistorias />)
    await screen.findByRole('button', { name: 'Nueva historia' })
    fireEvent.click(screen.getByRole('button', { name: 'Nueva historia' }))
    llenar({})
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [archivo] } })
    fireEvent.click(screen.getByRole('switch', { name: /Visible/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar historia' }))

    expect(await screen.findByText('Se guardó, pero la foto no se pudo subir.')).toBeTruthy()
    expect(guardarHistoria).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(reintentarFotoHistoria).toHaveBeenCalledTimes(1))
    expect(guardarHistoria).toHaveBeenCalledTimes(1)
    expect(reintentarFotoHistoria).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'h1', archivo, publicar: true }),
    )
  })
})
