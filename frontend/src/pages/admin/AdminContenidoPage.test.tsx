import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createMemoryRouter,
  MemoryRouter,
  Route,
  RouterProvider,
  Routes,
  useLocation,
} from 'react-router-dom'
import { rutasAplicacion } from '@/app/rutas'
import { AdminContenidoPage } from '@/pages/admin/AdminContenidoPage'
import { actualizarCanal, listarCanales } from '@/services/admin/canales.service'
import {
  actualizarContenido,
  listarContenido,
  reemplazarImagenContenido,
} from '@/services/admin/contenido.service'
import { consultarEstadoAdministrativo, consultarSesion } from '@/services/auth.service'
import type { CanalAdmin } from '@/services/admin/canales.service'
import type { ContenidoInstitucionalAdmin } from '@/services/admin/contenido.service'

const hero: ContenidoInstitucionalAdmin = {
  clave: 'hero_principal',
  tituloEs: 'Creemos que',
  tituloEn: 'We believe',
  textoEs: 'y nuestra labor',
  textoEn: 'and our work',
  imagenRuta: 'contenido/hero_principal/a.jpg',
  imagenUrl: 'https://cdn.test/hero.jpg',
  orden: 10,
  visible: true,
  actualizadoEn: '2026-11-03T15:00:00.000Z',
}

const intro: ContenidoInstitucionalAdmin = {
  clave: 'programa_intro',
  tituloEs: 'Introducción',
  tituloEn: 'Introduction',
  textoEs: 'Texto del programa',
  textoEn: 'Program text',
  imagenRuta: null,
  imagenUrl: null,
  orden: 20,
  visible: false,
  actualizadoEn: '2026-11-03T15:00:00.000Z',
}

const canales: CanalAdmin[] = [
  {
    tipo: 'whatsapp',
    url: 'https://wa.me/59170000000',
    textoEs: '¿Hablamos?',
    textoEn: 'Message us',
    orden: 1,
    activo: true,
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  },
  {
    tipo: 'facebook',
    url: 'https://www.facebook.com/actual',
    textoEs: 'Facebook',
    textoEn: 'Facebook',
    orden: 2,
    activo: true,
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  },
  {
    tipo: 'instagram',
    url: 'https://www.instagram.com/fenix',
    textoEs: 'Instagram',
    textoEn: 'Instagram',
    orden: 3,
    activo: false,
    actualizadoEn: '2026-01-01T00:00:00.000Z',
  },
]

vi.mock('@/services/admin/canales.service', () => ({
  listarCanales: vi.fn(),
  actualizarCanal: vi.fn(),
}))

vi.mock('@/services/admin/contenido.service', () => ({
  listarContenido: vi.fn(),
  actualizarContenido: vi.fn(),
  reemplazarImagenContenido: vi.fn(),
}))

vi.mock('@/services/admin/historias.service', () => ({
  listarHistorias: vi.fn(() => Promise.resolve([])),
  guardarHistoria: vi.fn(),
  reintentarFotoHistoria: vi.fn(),
  actualizarHistoria: vi.fn(),
  eliminarHistoria: vi.fn(),
  reordenarHistorias: vi.fn(),
}))

vi.mock('@/services/auth.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth.service')>()
  return {
    ...actual,
    consultarEstadoAdministrativo: vi.fn(),
    consultarSesion: vi.fn(),
  }
})

const sesion = {
  autenticado: true as const,
  administrador: { id: 'admin-1', nombre: 'Administración FÉNIX' },
  csrfToken: 'csrf-token',
  expiraEn: '2026-10-22T15:30:00.000Z',
}

function Ubicacion() {
  const location = useLocation()
  return <output data-testid="ubicacion">{`${location.pathname}${location.search}`}</output>
}

function renderContenido(entrada: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route
            path="/admin/contenido"
            element={
              <>
                <AdminContenidoPage />
                <Ubicacion />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function botonGuardar() {
  return screen.getByRole('button', { name: 'Guardar cambios' }) as HTMLButtonElement
}

beforeEach(() => {
  vi.mocked(listarContenido).mockResolvedValue([hero, intro])
  vi.mocked(listarCanales).mockResolvedValue(canales)
  vi.mocked(actualizarContenido).mockImplementation(async (clave, cuerpo) => ({
    ...(clave === hero.clave ? hero : intro),
    tituloEs: cuerpo.tituloEs,
    tituloEn: cuerpo.tituloEn,
    textoEs: cuerpo.textoEs,
    textoEn: cuerpo.textoEn,
    visible: cuerpo.visible,
    actualizadoEn: '2026-11-04T15:00:00.000Z',
  }))
  vi.mocked(reemplazarImagenContenido).mockImplementation(async () => ({
    ...hero,
    imagenUrl: 'https://cdn.test/nueva.jpg',
    actualizadoEn: '2026-11-04T16:00:00.000Z',
  }))
  vi.mocked(actualizarCanal).mockImplementation(async (canal, entrada) => ({
    ...canal,
    url: entrada.url,
    textoEs: entrada.textoEs,
  }))
  vi.mocked(consultarSesion).mockResolvedValue(sesion)
  vi.mocked(consultarEstadoAdministrativo).mockResolvedValue({
    status: 'ok',
    administrador: sesion.administrador,
    timestamp: '2026-10-22T15:30:00.000Z',
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AdminContenidoPage', () => {
  it('abre en Secciones si la pestaña falta o no es válida', async () => {
    renderContenido('/admin/contenido')
    expect(screen.getByRole('tab', { name: 'Secciones', selected: true })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(screen.queryByText('Historias destacadas: próximamente')).toBeNull()
    expect(botonGuardar().disabled).toBe(true)

    cleanup()
    renderContenido('/admin/contenido?pestana=otra')
    expect(screen.getByRole('tab', { name: 'Secciones', selected: true })).toBeTruthy()
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeTruthy()
    expect(await screen.findByRole('textbox', { name: 'WhatsApp Enlace' })).toBeTruthy()
  })

  it('muestra Historias destacadas cuando la URL lo pide y al usar las flechas', async () => {
    renderContenido('/admin/contenido?pestana=historias')
    expect(screen.getByRole('tab', { name: 'Historias destacadas', selected: true })).toBeTruthy()
    expect(await screen.findByText('Aún no hay historias')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'WhatsApp Enlace' })).toBeNull()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Historias destacadas' }), {
      key: 'ArrowLeft',
    })
    expect(screen.getByRole('tab', { name: 'Secciones', selected: true })).toBeTruthy()
    expect(screen.getByTestId('ubicacion').textContent).toBe('/admin/contenido?pestana=secciones')

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Secciones' }), { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Historias destacadas', selected: true })).toBeTruthy()
    expect(screen.getByTestId('ubicacion').textContent).toBe('/admin/contenido?pestana=historias')
  })

  it('edita el bloque seleccionado y deja Guardar deshabilitado sin cambios', async () => {
    renderContenido('/admin/contenido?pestana=secciones')
    const titulo = await screen.findByLabelText('Título *')
    expect((titulo as HTMLInputElement).value).toBe('Creemos que')
    expect(botonGuardar().disabled).toBe(true)

    fireEvent.change(titulo, { target: { value: 'Creemos que cada vida' } })
    expect(botonGuardar().disabled).toBe(false)
    expect(screen.getByText('Creemos que cada vida')).toBeTruthy()

    fireEvent.click(botonGuardar())

    await waitFor(() => expect(actualizarContenido).toHaveBeenCalledTimes(1))
    expect(actualizarContenido).toHaveBeenCalledWith('hero_principal', {
      tituloEs: 'Creemos que cada vida',
      tituloEn: 'We believe',
      textoEs: 'y nuestra labor',
      textoEn: 'and our work',
      visible: true,
    })
    expect(reemplazarImagenContenido).not.toHaveBeenCalled()
    await waitFor(() => expect(botonGuardar().disabled).toBe(true))
    expect(screen.getByText('Última actualización: 4 nov 2026')).toBeTruthy()
  })

  it('muestra el error junto al campo vacío y no llama al API', async () => {
    renderContenido('/admin/contenido?pestana=secciones')
    const titulo = await screen.findByLabelText('Título *')
    fireEvent.change(titulo, { target: { value: '   ' } })
    fireEvent.click(botonGuardar())

    expect(await screen.findByText('Completa este campo.')).toBeTruthy()
    expect(titulo.getAttribute('aria-invalid')).toBe('true')
    expect(actualizarContenido).not.toHaveBeenCalled()
  })

  it('pide confirmación al cambiar de bloque y Descartar restaura lo guardado', async () => {
    renderContenido('/admin/contenido?pestana=secciones')
    const titulo = await screen.findByLabelText('Título *')
    fireEvent.change(titulo, { target: { value: 'Borrador' } })

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect((screen.getByLabelText('Título *') as HTMLInputElement).value).toBe('Creemos que')
    expect(botonGuardar().disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Borrador' } })
    fireEvent.click(screen.getByRole('button', { name: /Nuestro programa/ }))
    expect(screen.getByRole('dialog', { name: 'Descartar cambios' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByLabelText('Título *') as HTMLInputElement).value).toBe('Borrador')

    fireEvent.click(screen.getByRole('button', { name: /Nuestro programa/ }))
    const dialogo = screen.getByRole('dialog', { name: 'Descartar cambios' })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descartar' }))
    expect(await screen.findByRole('heading', { name: 'Nuestro programa' })).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByLabelText('Imagen del bloque')).toBeNull()
    expect(screen.queryByText('Reemplazar imagen')).toBeNull()
  })

  it('pide confirmación al cambiar de pestaña con cambios sin guardar', async () => {
    renderContenido('/admin/contenido?pestana=secciones')
    fireEvent.change(await screen.findByLabelText('Título *'), { target: { value: 'Borrador' } })
    fireEvent.click(screen.getByRole('tab', { name: 'Historias destacadas' }))

    const dialogo = screen.getByRole('dialog', { name: 'Descartar cambios' })
    expect(screen.getByTestId('ubicacion').textContent).toBe('/admin/contenido?pestana=secciones')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Descartar' }))

    expect(screen.getByRole('tab', { name: 'Historias destacadas', selected: true })).toBeTruthy()
    expect(screen.getByTestId('ubicacion').textContent).toBe('/admin/contenido?pestana=historias')
  })

  it('si la imagen falla después del texto, el reintento no vuelve a guardar el texto', async () => {
    vi.mocked(reemplazarImagenContenido)
      .mockRejectedValueOnce(new Error('fallo'))
      .mockResolvedValueOnce({
        ...hero,
        tituloEs: 'Creemos que',
        imagenUrl: 'https://cdn.test/nueva.jpg',
        actualizadoEn: '2026-11-04T16:00:00.000Z',
      })
    renderContenido('/admin/contenido?pestana=secciones')
    await screen.findByLabelText('Título *')

    const archivo = new File(['png'], 'bloque.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [archivo] },
    })
    fireEvent.click(botonGuardar())

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Se guardó, pero la imagen no se pudo subir',
    )
    expect(actualizarContenido).not.toHaveBeenCalled()
    expect(reemplazarImagenContenido).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(reemplazarImagenContenido).toHaveBeenCalledTimes(2))
    expect(actualizarContenido).not.toHaveBeenCalled()
    expect(await screen.findByText('Cambios guardados.')).toBeTruthy()
  })

  it('guarda solo los canales modificados y muestra la URL inválida en su campo', async () => {
    renderContenido('/admin/contenido?pestana=secciones')
    const whatsapp = await screen.findByRole('textbox', { name: 'WhatsApp Enlace' })
    const facebook = screen.getByRole('textbox', { name: 'Facebook Enlace' })

    fireEvent.change(facebook, { target: { value: 'nota' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar canales' }))
    expect(await screen.findByText('El enlace debe empezar por https:// o mailto:.')).toBeTruthy()
    expect(actualizarCanal).not.toHaveBeenCalled()

    fireEvent.change(facebook, { target: { value: 'https://www.facebook.com/actual' } })
    fireEvent.change(whatsapp, { target: { value: 'https://wa.me/59171111111' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar canales' }))

    await waitFor(() => expect(actualizarCanal).toHaveBeenCalledTimes(1))
    expect(actualizarCanal).toHaveBeenCalledWith(canales[0], {
      url: 'https://wa.me/59171111111',
      textoEs: '¿Hablamos?',
    })
  })

  it('redirige /admin/canales a /admin/contenido', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const router = createMemoryRouter(rutasAplicacion, {
      initialEntries: ['/admin/canales'],
    })

    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    )

    expect(await screen.findByRole('heading', { name: 'Contenido del sitio' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/admin/contenido')
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
