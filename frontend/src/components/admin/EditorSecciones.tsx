import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'
import { CampoTexto } from '@/components/admin/ui/CampoTexto'
import { Card } from '@/components/ui/Card'
import { Interruptor } from '@/components/admin/ui/Interruptor'
import { MarcaEstado } from '@/components/admin/ui/MarcaEstado'
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin'
import { ReemplazarImagen } from '@/components/admin/ui/ReemplazarImagen'
import { textosAdmin } from '@/content/textos-admin'
import {
  bloqueMuestraImagen,
  nombreBloque,
  validarBloque,
  type BorradorBloque,
  type ErroresBloque,
} from '@/schemas/contenido-bloque'
import { agruparBloques, type IdGrupoContenido } from '@/schemas/grupos-contenido'
import {
  actualizarContenido,
  listarContenido,
  reemplazarImagenContenido,
  type ActualizarContenido,
  type ContenidoInstitucionalAdmin,
} from '@/services/admin/contenido.service'

type EditorSeccionesProps = {
  salidaPendiente: boolean
  onCambioSucio: (sucio: boolean) => void
  onCancelarSalida: () => void
  onConfirmarSalida: () => void
}

function desde(bloque: ContenidoInstitucionalAdmin): BorradorBloque {
  return {
    tituloEs: bloque.tituloEs ?? '',
    tituloEn: bloque.tituloEn ?? '',
    textoEs: bloque.textoEs ?? '',
    textoEn: bloque.textoEn ?? '',
    visible: bloque.visible,
  }
}

function aPayload(borrador: BorradorBloque): ActualizarContenido {
  return {
    tituloEs: borrador.tituloEs.trim(),
    tituloEn: borrador.tituloEn.trim(),
    textoEs: borrador.textoEs.trim(),
    textoEn: borrador.textoEn.trim(),
    visible: borrador.visible,
  }
}

function textoDistinto(borrador: BorradorBloque, bloque: ContenidoInstitucionalAdmin): boolean {
  const payload = aPayload(borrador)
  return (
    payload.tituloEs !== (bloque.tituloEs ?? '').trim() ||
    payload.tituloEn !== (bloque.tituloEn ?? '').trim() ||
    payload.textoEs !== (bloque.textoEs ?? '').trim() ||
    payload.textoEn !== (bloque.textoEn ?? '').trim() ||
    payload.visible !== bloque.visible
  )
}

function fechaCorta(iso: string): string {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha)
  const [anio, mes, dia] = partes.split('-').map(Number)
  const nombre = mes ? textosAdmin.donaciones.meses[mes - 1] : undefined
  if (!anio || !dia || !nombre) return iso
  return textosAdmin.donaciones.fechaCorta(dia, nombre, anio)
}

export function EditorSecciones({
  salidaPendiente,
  onCambioSucio,
  onCancelarSalida,
  onConfirmarSalida,
}: EditorSeccionesProps) {
  const textos = textosAdmin.contenido
  const queryClient = useQueryClient()
  const bloquesQuery = useQuery({
    queryKey: ['admin-contenido'],
    queryFn: listarContenido,
  })
  const [claveSel, setClaveSel] = useState<string | null>(null)
  const [ajustado, setAjustado] = useState<string | null>(null)
  const [draft, setDraft] = useState<BorradorBloque | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errores, setErrores] = useState<ErroresBloque>({})
  const [avisoImagen, setAvisoImagen] = useState(false)
  const [errorGuardado, setErrorGuardado] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [idioma, setIdioma] = useState<'es' | 'en'>('es')
  const [vista, setVista] = useState<{ archivo: File | null; url: string | null }>({
    archivo: null,
    url: null,
  })

  const bloques = bloquesQuery.data ?? []
  const grupos = agruparBloques(bloques)
  const clave =
    claveSel && bloques.some((bloque) => bloque.clave === claveSel)
      ? claveSel
      : (grupos[0]?.bloques[0]?.clave ?? null)
  const bloque = bloques.find((item) => item.clave === clave) ?? null
  const grupo = grupos.find((item) => item.bloques.some((parte) => parte.clave === bloque?.clave))

  if (bloque && ajustado !== bloque.clave) {
    setAjustado(bloque.clave)
    setDraft(desde(bloque))
    setArchivo(null)
    setErrores({})
    setAvisoImagen(false)
    setErrorGuardado(null)
  }

  if (archivo !== vista.archivo) {
    setVista({
      archivo,
      url: archivo ? URL.createObjectURL(archivo) : null,
    })
  }

  const sucio = Boolean(
    draft && bloque && (textoDistinto(draft, bloque) || archivo),
  )

  useEffect(() => {
    onCambioSucio(sucio)
  }, [onCambioSucio, sucio])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const url = vista.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [vista.url])

  function integrar(actual: ContenidoInstitucionalAdmin) {
    queryClient.setQueryData<ContenidoInstitucionalAdmin[]>(['admin-contenido'], (lista) =>
      lista?.map((item) => (item.clave === actual.clave ? actual : item)),
    )
    setDraft(desde(actual))
  }

  function elegir(siguiente: string) {
    if (siguiente === clave) return
    if (sucio) {
      setPendiente(siguiente)
      return
    }
    setClaveSel(siguiente)
  }

  function elegirGrupo(id: IdGrupoContenido) {
    const destino = grupos.find((item) => item.id === id)?.bloques[0]
    if (!destino) return
    elegir(destino.clave)
  }

  function descartar() {
    if (!bloque) return
    setDraft(desde(bloque))
    setArchivo(null)
    setErrores({})
    setAvisoImagen(false)
    setErrorGuardado(null)
  }

  async function guardar() {
    if (guardando || !bloque || !draft || !sucio) return
    const validacion = validarBloque(draft)
    if (validacion) {
      setErrores(validacion)
      return
    }
    setErrores({})
    setGuardando(true)
    setErrorGuardado(null)
    setAvisoImagen(false)
    try {
      let actual = bloque
      if (textoDistinto(draft, bloque)) {
        actual = await actualizarContenido(bloque.clave, aPayload(draft))
        integrar(actual)
      }
      if (archivo) {
        try {
          actual = await reemplazarImagenContenido(bloque.clave, archivo)
          integrar(actual)
          setArchivo(null)
          setToast(textosAdmin.supuestos.guardado)
        } catch {
          setAvisoImagen(true)
        }
      } else {
        setToast(textosAdmin.supuestos.guardado)
      }
    } catch (error) {
      setErrorGuardado(
        error instanceof Error ? error.message : textosAdmin.supuestos.noGuardado,
      )
    } finally {
      setGuardando(false)
    }
  }

  function confirmarSalida() {
    if (pendiente) {
      setClaveSel(pendiente)
      setPendiente(null)
      return
    }
    onConfirmarSalida()
  }

  const modalAbierto = pendiente !== null || salidaPendiente
  const tituloVista = idioma === 'en' ? draft?.tituloEn : draft?.tituloEs
  const textoVista = idioma === 'en' ? draft?.textoEn : draft?.textoEs
  const muestraImagen = bloque ? bloqueMuestraImagen(bloque) : false
  const srcVista = vista.url ?? bloque?.imagenUrl ?? null

  return (
    <Card radius="admin" elevated="panel" className="flex w-full min-w-0 items-stretch overflow-hidden">
      {/* TODO(responsive): el Figma no tiene móvil; esta fila es el escritorio. */}
      {bloquesQuery.isPending ? (
        <div className="flex w-full flex-col gap-3 p-6" role="status" aria-label={textosAdmin.supuestos.cargando}>
          <div className="bg-crema-tono h-4 w-40 animate-pulse rounded-btn" />
          <div className="bg-crema-tono h-12 animate-pulse rounded-btn" />
          <div className="bg-crema-tono h-12 animate-pulse rounded-btn" />
          <div className="bg-crema-tono h-12 animate-pulse rounded-btn" />
        </div>
      ) : bloquesQuery.isError ? (
        <div className="flex flex-col items-start gap-4 p-6">
          <p className="t-body text-negro" role="alert">
            {bloquesQuery.error instanceof Error
              ? bloquesQuery.error.message
              : textosAdmin.supuestos.error}
          </p>
          <BotonPildora variante="ghost" onClick={() => void bloquesQuery.refetch()}>
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : bloques.length === 0 || !bloque || !draft || !grupo ? (
        <p className="t-body text-negro p-6">{textosAdmin.supuestos.vacio}</p>
      ) : (
        <>
          <div className="flex w-(--spacing-lista-bloques) shrink-0 flex-col gap-1 p-6">
            <p className="t-eyebrow text-texto-secundario">{textos.bloques}</p>
            <div aria-label={textos.bloques} className="flex flex-col gap-1">
              {grupos.map((item) => {
                const seleccionado = item.id === grupo?.id
                const visibles = item.bloques.filter((parte) => parte.visible).length
                const estado =
                  visibles === item.bloques.length ? 'visible' : visibles === 0 ? 'oculto' : 'parcial'
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={seleccionado ? 'true' : undefined}
                    className={
                      seleccionado
                        ? 'bg-crema-tono flex min-h-12 w-full items-center justify-between gap-2 rounded-btn px-3.5 py-2 text-left'
                        : 'flex min-h-12 w-full items-center justify-between gap-2 rounded-btn px-3.5 py-2 text-left'
                    }
                    onClick={() => elegirGrupo(item.id)}
                  >
                    <span className={seleccionado ? 't-nav min-w-0 font-semibold' : 't-nav min-w-0'}>
                      {textos.grupos[item.id]}
                    </span>
                    <MarcaEstado activo={estado !== 'oculto'}>
                      {estado === 'visible'
                        ? textos.visible
                        : estado === 'oculto'
                          ? textos.oculto
                          : textos.parcial}
                    </MarcaEstado>
                  </button>
                )
              })}
            </div>
          </div>

          <form
            className="border-linea flex min-w-0 flex-1 flex-col gap-5 border-l p-7"
            onSubmit={(event) => {
              event.preventDefault()
              void guardar()
            }}
          >
            <header className="flex flex-col gap-1">
              <h2 className="t-heading-card text-negro">{textos.grupos[grupo.id]}</h2>
              <p className="t-small text-texto-secundario">{nombreBloque(bloque)}</p>
            </header>

            {grupo.bloques.length > 1 ? (
              <div className="flex flex-col gap-1" aria-label={textos.textosDeSeccion}>
                <p className="t-eyebrow text-texto-secundario">{textos.textosDeSeccion}</p>
                {grupo.bloques.map((item) => {
                  const activo = item.clave === bloque.clave
                  return (
                    <button
                      key={item.clave}
                      type="button"
                      aria-pressed={activo}
                      className={
                        activo
                          ? 'bg-crema-tono flex min-h-12 w-full items-center justify-between gap-2 rounded-btn px-3.5 text-left'
                          : 'flex min-h-12 w-full items-center justify-between gap-2 rounded-btn px-3.5 text-left'
                      }
                      onClick={() => elegir(item.clave)}
                    >
                      <span className={activo ? 't-nav min-w-0 truncate font-semibold' : 't-nav min-w-0 truncate'}>
                        {nombreBloque(item)}
                      </span>
                      <MarcaEstado activo={item.visible}>
                        {item.visible ? textos.visible : textos.oculto}
                      </MarcaEstado>
                    </button>
                  )
                })}
              </div>
            ) : null}

            <Interruptor
              id={`visible-${bloque.clave}`}
              etiqueta={textos.mostrar}
              nota={textos.mostrarNota}
              activo={draft.visible}
              onChange={(visible) => {
                setDraft({ ...draft, visible })
                setErrorGuardado(null)
              }}
            />

            <div className="flex items-start gap-5">
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <p className="t-small font-semibold text-negro">{textos.espanol}</p>
                <CampoTexto
                  id={`titulo-es-${bloque.clave}`}
                  etiqueta={textos.campoTitulo}
                  valor={draft.tituloEs}
                  error={errores.tituloEs}
                  idioma="es"
                  onChange={(tituloEs) => {
                    setDraft({ ...draft, tituloEs })
                    setErrores((actual) => ({ ...actual, tituloEs: undefined }))
                  }}
                />
                <CampoTexto
                  id={`texto-es-${bloque.clave}`}
                  etiqueta={textos.campoTexto}
                  valor={draft.textoEs}
                  error={errores.textoEs}
                  idioma="es"
                  multilinea
                  onChange={(textoEs) => {
                    setDraft({ ...draft, textoEs })
                    setErrores((actual) => ({ ...actual, textoEs: undefined }))
                  }}
                />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <p className="t-small font-semibold text-negro">{textos.ingles}</p>
                <CampoTexto
                  id={`titulo-en-${bloque.clave}`}
                  etiqueta={textos.campoTituloEn}
                  valor={draft.tituloEn}
                  error={errores.tituloEn}
                  idioma="en"
                  onChange={(tituloEn) => {
                    setDraft({ ...draft, tituloEn })
                    setErrores((actual) => ({ ...actual, tituloEn: undefined }))
                  }}
                />
                <CampoTexto
                  id={`texto-en-${bloque.clave}`}
                  etiqueta={textos.campoTextoEn}
                  valor={draft.textoEn}
                  error={errores.textoEn}
                  idioma="en"
                  multilinea
                  onChange={(textoEn) => {
                    setDraft({ ...draft, textoEn })
                    setErrores((actual) => ({ ...actual, textoEn: undefined }))
                  }}
                />
              </div>
            </div>

            {muestraImagen ? (
              <div className="flex flex-col gap-2.5">
                <p className="t-chip text-negro">{textos.imagen}</p>
                <ReemplazarImagen
                  src={bloque.imagenUrl}
                  archivo={archivo}
                  onArchivo={(nuevo) => {
                    setArchivo(nuevo)
                    setAvisoImagen(false)
                  }}
                />
              </div>
            ) : null}

            <div className="border-linea flex items-center justify-between gap-4 border-t pt-5">
              <p className="t-small text-texto-secundario">
                {textos.ultimaActualizacion(fechaCorta(bloque.actualizadoEn))}
              </p>
              <div className="flex gap-3">
                <BotonPildora variante="ghost" disabled={!sucio || guardando} onClick={descartar}>
                  {textos.descartar}
                </BotonPildora>
                <BotonPildora type="submit" disabled={!sucio || guardando} aria-busy={guardando}>
                  {guardando ? textosAdmin.supuestos.guardando : textos.guardar}
                </BotonPildora>
              </div>
            </div>
            {errorGuardado ? (
              <p className="t-small text-red-700" role="alert">
                {errorGuardado}
              </p>
            ) : null}
            {avisoImagen ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="t-small text-red-700" role="alert">
                  {textos.imagenNoSubio}
                </p>
                <BotonPildora variante="ghost" disabled={guardando} onClick={() => void guardar()}>
                  {textosAdmin.supuestos.reintentar}
                </BotonPildora>
              </div>
            ) : null}
          </form>

          <aside className="border-linea flex w-(--spacing-panel-detalle) shrink-0 flex-col gap-4 border-l p-6">
            <p className="t-eyebrow text-texto-secundario">{textos.vista}</p>
            <div className="flex gap-2" role="group" aria-label={textos.vista}>
              <button
                type="button"
                aria-pressed={idioma === 'es'}
                className={
                  idioma === 'es'
                    ? 't-chip rounded-pill bg-negro px-3.5 py-2 text-crema'
                    : 't-chip border-linea rounded-pill border bg-blanco px-3.5 py-2 text-negro'
                }
                onClick={() => setIdioma('es')}
              >
                {textos.idiomaEs}
              </button>
              <button
                type="button"
                aria-pressed={idioma === 'en'}
                className={
                  idioma === 'en'
                    ? 't-chip rounded-pill bg-negro px-3.5 py-2 text-crema'
                    : 't-chip border-linea rounded-pill border bg-blanco px-3.5 py-2 text-negro'
                }
                onClick={() => setIdioma('en')}
              >
                {textos.idiomaEn}
              </button>
            </div>
            <div className="bg-crema-tono flex flex-col gap-3.5 rounded-admin p-5">
              {muestraImagen ? (
                <div className="bg-crema-tono h-32 overflow-hidden rounded-btn">
                  {srcVista ? (
                    <img src={srcVista} alt="" className="size-full object-cover" />
                  ) : null}
                </div>
              ) : null}
              <p className="t-heading-card text-negro whitespace-pre-wrap">{tituloVista}</p>
              <p className="t-body text-negro whitespace-pre-wrap">{textoVista}</p>
            </div>
            <p className="t-small text-texto-secundario">
              {idioma === 'en' ? textos.vistaNotaEn : textos.vistaNota}
            </p>
          </aside>
        </>
      )}

      {modalAbierto ? (
        <ModalAdmin
          abierto
          titulo={textosAdmin.supuestos.descartarTitulo}
          onCerrar={() => {
            setPendiente(null)
            onCancelarSalida()
          }}
          pie={
            <>
              <BotonPildora
                variante="ghost"
                onClick={() => {
                  setPendiente(null)
                  onCancelarSalida()
                }}
              >
                {textosAdmin.supuestos.cancelar}
              </BotonPildora>
              <BotonPildora onClick={confirmarSalida}>{textos.descartar}</BotonPildora>
            </>
          }
        >
          <p className="t-control text-negro">{textosAdmin.supuestos.descartarCambios}</p>
        </ModalAdmin>
      ) : null}

      {toast ? (
        <p
          role="status"
          className="t-nav bg-negro text-crema fixed bottom-6 left-1/2 -translate-x-1/2 rounded-pill px-5 py-3"
        >
          {toast}
        </p>
      ) : null}
    </Card>
  )
}
