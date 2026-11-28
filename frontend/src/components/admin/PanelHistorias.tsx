import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'
import { ConfirmarEliminarModal } from '@/components/admin/ui/ConfirmarEliminarModal'
import { MarcaEstado } from '@/components/admin/ui/MarcaEstado'
import { HistoriaFormModal } from '@/components/admin/HistoriaFormModal'
import { Card } from '@/components/ui/Card'
import { textosAdmin } from '@/content/textos-admin'
import { useVistaMovil } from '@/hooks/useVistaMovil'
import { esPeticionCancelada } from '@/hooks/useBusquedaAdmin'
import { cn } from '@/lib/cn'
import type { DatosHistoria } from '@/schemas/historia'
import { ErrorApiAdmin } from '@/services/admin/cliente-admin'
import {
  actualizarHistoria,
  eliminarHistoria,
  guardarHistoria,
  listarHistorias,
  reintentarFotoHistoria,
  reordenarHistorias,
  type GuardarHistoria,
  type HistoriaAdmin,
} from '@/services/admin/historias.service'

type Carga = 'cargando' | 'listo' | 'error'

type PendienteFoto = {
  id: string
  entrada: GuardarHistoria
  archivo: File | null
  publicar: boolean
}

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const

function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const nombre = mes ? MESES[mes - 1] : undefined
  if (!anio || !dia || !nombre) return iso
  return `${dia} ${nombre} ${anio}`
}

function entradaDe(datos: DatosHistoria): GuardarHistoria {
  return {
    animalNombre: datos.animalNombre,
    tituloEs: datos.tituloEs,
    tituloEn: datos.tituloEn,
    textoEs: datos.textoEs,
    textoEn: datos.textoEn,
    autorNombre: datos.autorNombre,
    fechaHistoria: datos.fechaHistoria,
  }
}

function entradaDeHistoria(historia: HistoriaAdmin): GuardarHistoria {
  return {
    animalNombre: historia.animalNombre,
    tituloEs: historia.tituloEs,
    tituloEn: historia.tituloEn,
    textoEs: historia.textoEs,
    textoEn: historia.textoEn,
    autorNombre: historia.autorNombre,
    fechaHistoria: historia.fechaHistoria,
  }
}

export function PanelHistorias() {
  const movil = useVistaMovil()
  const textos = textosAdmin.contenido.historiasForm
  const [carga, setCarga] = useState<Carga>('cargando')
  const [intento, setIntento] = useState(0)
  const [historias, setHistorias] = useState<HistoriaAdmin[]>([])
  const [modal, setModal] = useState<HistoriaAdmin | null | 'nueva'>(null)
  const [confirmar, setConfirmar] = useState<HistoriaAdmin | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState<PendienteFoto | null>(null)
  const [reintentando, setReintentando] = useState(false)
  const ocupadoRef = useRef(false)

  useEffect(() => {
    const controlador = new AbortController()
    let vivo = true
    listarHistorias(controlador.signal)
      .then((lista) => {
        if (!vivo) return
        setHistorias(lista)
        setCarga('listo')
      })
      .catch((error: unknown) => {
        if (!vivo || esPeticionCancelada(error)) return
        setCarga('error')
      })
    return () => {
      vivo = false
      controlador.abort()
    }
  }, [intento])

  useEffect(() => {
    if (!aviso) return
    const timer = window.setTimeout(() => setAviso(null), 4000)
    return () => window.clearTimeout(timer)
  }, [aviso])

  async function recargar() {
    try {
      const lista = await listarHistorias()
      setHistorias(lista)
      setCarga('listo')
    } catch (error: unknown) {
      if (esPeticionCancelada(error)) return
      setCarga('error')
    }
  }

  async function alGuardar(datos: DatosHistoria) {
    if (ocupadoRef.current) return
    ocupadoRef.current = true
    setGuardando(true)
    setErrorModal(null)
    const editando = modal && modal !== 'nueva' ? modal : null
    try {
      const resultado = await guardarHistoria({
        id: editando?.id,
        entrada: entradaDe(datos),
        visible: datos.visible,
        foto: datos.foto,
        tieneFoto: Boolean(editando?.foto),
      })
      const id = resultado.historia?.id ?? editando?.id
      if (resultado.archivoPendiente || resultado.publicarPendiente) {
        if (id) {
          setPendiente({
            id,
            entrada: entradaDe(datos),
            archivo: resultado.archivoPendiente,
            publicar: resultado.publicarPendiente,
          })
        }
      } else {
        setPendiente(null)
        setAviso(textosAdmin.supuestos.guardado)
      }
      setModal(null)
      await recargar()
    } catch (error: unknown) {
      setErrorModal(
        error instanceof ErrorApiAdmin ? error.message : textosAdmin.supuestos.noGuardado,
      )
    } finally {
      ocupadoRef.current = false
      setGuardando(false)
    }
  }

  async function reintentar() {
    if (!pendiente || reintentando) return
    setReintentando(true)
    try {
      const resultado = await reintentarFotoHistoria({
        id: pendiente.id,
        entrada: pendiente.entrada,
        archivo: pendiente.archivo,
        publicar: pendiente.publicar,
      })
      if (resultado.archivoPendiente || resultado.publicarPendiente) {
        setPendiente({
          ...pendiente,
          archivo: resultado.archivoPendiente,
          publicar: resultado.publicarPendiente,
        })
      } else {
        setPendiente(null)
        setAviso(textosAdmin.supuestos.guardado)
        await recargar()
      }
    } catch {
      setErrorAccion(textosAdmin.supuestos.noGuardado)
    } finally {
      setReintentando(false)
    }
  }

  async function cambiarVisible(historia: HistoriaAdmin) {
    if (ocupadoRef.current) return
    ocupadoRef.current = true
    setOcupado(true)
    setErrorAccion(null)
    try {
      await actualizarHistoria(historia.id, {
        ...entradaDeHistoria(historia),
        visible: !historia.visible,
      })
      await recargar()
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof ErrorApiAdmin ? error.message : textosAdmin.supuestos.noGuardado,
      )
    } finally {
      ocupadoRef.current = false
      setOcupado(false)
    }
  }

  async function confirmarBorrado() {
    if (!confirmar || borrando) return
    setBorrando(true)
    setErrorBorrado(null)
    try {
      await eliminarHistoria(confirmar.id)
      setConfirmar(null)
      setAviso(textosAdmin.supuestos.guardado)
      await recargar()
    } catch (error: unknown) {
      setErrorBorrado(
        error instanceof ErrorApiAdmin ? error.message : textosAdmin.supuestos.noGuardado,
      )
    } finally {
      setBorrando(false)
    }
  }

  async function mover(indice: number, direccion: -1 | 1) {
    const destino = indice + direccion
    if (destino < 0 || destino >= historias.length || ocupadoRef.current) return
    const ids = historias.map((historia) => historia.id)
    const [id] = ids.splice(indice, 1)
    if (!id) return
    ids.splice(destino, 0, id)
    ocupadoRef.current = true
    setOcupado(true)
    setErrorAccion(null)
    try {
      setHistorias(await reordenarHistorias(ids))
    } catch (error: unknown) {
      setErrorAccion(
        error instanceof ErrorApiAdmin ? error.message : textosAdmin.supuestos.noGuardado,
      )
    } finally {
      ocupadoRef.current = false
      setOcupado(false)
    }
  }

  const accionesBloqueadas = guardando || borrando || ocupado || reintentando

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {pendiente ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="t-small text-negro">
            {pendiente.archivo ? textosAdmin.supuestos.fotoNoSubio : textos.noSePublico}
          </p>
          <BotonPildora
            variante="ghost"
            disabled={reintentando}
            aria-busy={reintentando}
            onClick={() => void reintentar()}
          >
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : null}
      {aviso ? (
        <p className="t-small text-negro" role="status">
          {aviso}
        </p>
      ) : null}
      {errorAccion ? (
        <p className="t-small text-naranja" role="alert">
          {errorAccion}
        </p>
      ) : null}

      {carga === 'cargando' ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
          <div className="rounded-card bg-crema-tono h-(--size-control-admin) animate-pulse" />
          <div className="rounded-admin bg-crema-tono h-16 animate-pulse" />
          <div className="rounded-admin bg-crema-tono h-16 animate-pulse" />
        </div>
      ) : null}

      {carga === 'error' ? (
        <Card radius="admin" elevated="panel" className="flex flex-col items-start gap-3 p-6">
          <p className="t-body text-negro" role="alert">
            {textosAdmin.supuestos.error}
          </p>
          <BotonPildora
            variante="ghost"
            onClick={() => {
              setCarga('cargando')
              setIntento((valor) => valor + 1)
            }}
          >
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </Card>
      ) : null}

      {carga === 'listo' ? (
        <Card radius="admin" elevated="panel" className="flex min-w-0 flex-col gap-4 p-4 sm:p-6">
          <div className="flex items-center justify-end">
            <BotonPildora onClick={() => setModal('nueva')} disabled={accionesBloqueadas}>
              {textos.nueva}
            </BotonPildora>
          </div>

          {historias.length === 0 ? (
            <p className="t-body text-negro" role="status">
              {textos.vacio}
            </p>
          ) : movil ? (
            // TODO(responsive): no hay frame móvil en Figma; se apilan las filas con los mismos controles.
            <ul className="flex min-w-0 flex-col gap-3">
              {historias.map((historia, indice) => (
                <li key={historia.id} className="border-linea rounded-admin min-w-0 border p-3">
                  <FilaHistoria
                    historia={historia}
                    indice={indice}
                    total={historias.length}
                    movil
                    bloqueado={accionesBloqueadas}
                    onEditar={() => setModal(historia)}
                    onVisible={() => void cambiarVisible(historia)}
                    onEliminar={() => setConfirmar(historia)}
                    onMover={(direccion) => void mover(indice, direccion)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="min-w-0">
              <div className="text-texto-secundario t-small grid grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_6.5rem_auto] items-center gap-3 px-2 pb-2">
                <span aria-hidden="true" />
                <span>{textos.columnaTitulo}</span>
                <span>{textos.columnaAnimal}</span>
                <span>{textos.columnaFecha}</span>
                <span>{textos.columnaEstado}</span>
                <span>{textos.columnaAcciones}</span>
              </div>
              <ul className="flex min-w-0 flex-col">
                {historias.map((historia, indice) => (
                  <li
                    key={historia.id}
                    className="border-linea grid grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7.5rem_6.5rem_auto] items-center gap-3 border-t px-2 py-3"
                  >
                    <FilaHistoria
                      historia={historia}
                      indice={indice}
                      total={historias.length}
                      movil={false}
                      bloqueado={accionesBloqueadas}
                      onEditar={() => setModal(historia)}
                      onVisible={() => void cambiarVisible(historia)}
                      onEliminar={() => setConfirmar(historia)}
                      onMover={(direccion) => void mover(indice, direccion)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ) : null}

      {modal !== null ? (
        <HistoriaFormModal
          historia={modal === 'nueva' ? null : modal}
          guardando={guardando}
          error={errorModal}
          onCerrar={() => {
            if (!guardando) {
              setModal(null)
              setErrorModal(null)
            }
          }}
          onGuardar={(datos) => void alGuardar(datos)}
        />
      ) : null}

      {confirmar ? (
        <ConfirmarEliminarModal
          titulo={textos.confirmarEliminarTitulo}
          cuerpo={textos.confirmarEliminar}
          detalle={confirmar.tituloEs}
          accion={textos.confirmarEliminarAccion}
          peligro
          borrando={borrando}
          error={errorBorrado}
          onCancelar={() => {
            if (!borrando) {
              setConfirmar(null)
              setErrorBorrado(null)
            }
          }}
          onConfirmar={() => void confirmarBorrado()}
        />
      ) : null}
    </div>
  )
}

function FilaHistoria({
  historia,
  indice,
  total,
  movil,
  bloqueado,
  onEditar,
  onVisible,
  onEliminar,
  onMover,
}: {
  historia: HistoriaAdmin
  indice: number
  total: number
  movil: boolean
  bloqueado: boolean
  onEditar: () => void
  onVisible: () => void
  onEliminar: () => void
  onMover: (direccion: -1 | 1) => void
}) {
  const textos = textosAdmin.contenido.historiasForm
  const toque = movil ? 'size-11' : 'size-9'
  const acciones = (
    <div className={cn('flex items-center gap-1', movil && 'flex-wrap')}>
      <IconoAccion
        etiqueta={textos.editar(historia.tituloEs)}
        className={toque}
        disabled={bloqueado}
        onClick={onEditar}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </IconoAccion>
      <IconoAccion
        etiqueta={
          historia.visible ? textos.ocultar(historia.tituloEs) : textos.mostrar(historia.tituloEs)
        }
        className={toque}
        disabled={bloqueado}
        onClick={onVisible}
      >
        {historia.visible ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
      </IconoAccion>
      <IconoAccion
        etiqueta={textos.eliminar(historia.tituloEs)}
        className={toque}
        disabled={bloqueado}
        onClick={onEliminar}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </IconoAccion>
      <IconoAccion
        etiqueta={textos.subir(historia.tituloEs)}
        className={toque}
        disabled={bloqueado || indice === 0}
        onClick={() => onMover(-1)}
      >
        <ChevronUp className="size-4" aria-hidden="true" />
      </IconoAccion>
      <IconoAccion
        etiqueta={textos.bajar(historia.tituloEs)}
        className={toque}
        disabled={bloqueado || indice === total - 1}
        onClick={() => onMover(1)}
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </IconoAccion>
    </div>
  )

  const miniatura = historia.foto ? (
    <img
      src={historia.foto.url}
      alt={textos.miniatura(historia.animalNombre)}
      className="rounded-btn size-11 object-contain"
    />
  ) : (
    <span
      className="bg-crema-tono t-small text-texto-secundario rounded-btn flex size-11 items-center justify-center text-center"
      aria-hidden="true"
    />
  )

  if (movil) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {miniatura}
          <div className="min-w-0">
            <p className="t-control text-negro truncate">{historia.tituloEs}</p>
            <p className="t-small text-texto-secundario truncate">{historia.animalNombre}</p>
          </div>
        </div>
        <p className="t-small text-negro">
          <time dateTime={historia.fechaHistoria}>{fechaCorta(historia.fechaHistoria)}</time>
        </p>
        <MarcaEstado activo={historia.visible}>
          {historia.visible ? textos.estadoVisible : textos.estadoOculta}
        </MarcaEstado>
        {acciones}
      </div>
    )
  }

  return (
    <>
      {miniatura}
      <span className="t-control text-negro truncate">{historia.tituloEs}</span>
      <span className="t-control text-negro truncate">{historia.animalNombre}</span>
      <time className="t-control text-negro" dateTime={historia.fechaHistoria}>
        {fechaCorta(historia.fechaHistoria)}
      </time>
      <MarcaEstado activo={historia.visible}>
        {historia.visible ? textos.estadoVisible : textos.estadoOculta}
      </MarcaEstado>
      {acciones}
    </>
  )
}

function IconoAccion({
  etiqueta,
  className,
  disabled,
  onClick,
  children,
}: {
  etiqueta: string
  className: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'text-negro hover:bg-crema-tono inline-flex items-center justify-center rounded-full disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  )
}
