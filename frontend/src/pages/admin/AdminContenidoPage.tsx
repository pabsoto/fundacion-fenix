import { useCallback, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EditorSecciones } from '@/components/admin/EditorSecciones'
import { PanelHistorias } from '@/components/admin/PanelHistorias'
import { TarjetaCanales } from '@/components/admin/TarjetaCanales'
import { textosAdmin } from '@/content/textos-admin'
import { useVistaMovil } from '@/hooks/useVistaMovil'
import { cn } from '@/lib/cn'

const PESTANAS = ['secciones', 'historias'] as const
type Pestana = (typeof PESTANAS)[number]

function pestanaDesde(valor: string | null): Pestana {
  return valor === 'historias' ? 'historias' : 'secciones'
}

function idPestana(pestana: Pestana): string {
  return `contenido-pestana-${pestana}`
}

function idPanel(pestana: Pestana): string {
  return `contenido-panel-${pestana}`
}

function destinoTecla(actual: Pestana, tecla: string): Pestana | null {
  const indice = PESTANAS.indexOf(actual)
  if (tecla === 'ArrowRight') return PESTANAS[(indice + 1) % PESTANAS.length]
  if (tecla === 'ArrowLeft') return PESTANAS[(indice - 1 + PESTANAS.length) % PESTANAS.length]
  if (tecla === 'Home') return 'secciones'
  if (tecla === 'End') return 'historias'
  return null
}

export function AdminContenidoPage() {
  const movil = useVistaMovil()
  const [params, setParams] = useSearchParams()
  const botones = useRef<Partial<Record<Pestana, HTMLButtonElement | null>>>({})
  const [sucioSecciones, setSucioSecciones] = useState(false)
  const [sucioCanales, setSucioCanales] = useState(false)
  const [salida, setSalida] = useState<Pestana | null>(null)
  const activa = pestanaDesde(params.get('pestana'))
  const textos = textosAdmin.contenido
  const avisarSecciones = useCallback((sucio: boolean) => setSucioSecciones(sucio), [])
  const avisarCanales = useCallback((sucio: boolean) => setSucioCanales(sucio), [])

  function aplicar(pestana: Pestana, enfocar: boolean) {
    const siguientes = new URLSearchParams(params)
    siguientes.set('pestana', pestana)
    setParams(siguientes, { replace: true })
    if (enfocar) botones.current[pestana]?.focus()
  }

  function irA(pestana: Pestana, enfocar: boolean) {
    if (pestana === activa) return
    if (activa === 'secciones' && (sucioSecciones || sucioCanales)) {
      setSalida(pestana)
      return
    }
    aplicar(pestana, enfocar)
  }

  function alTeclado(event: KeyboardEvent<HTMLDivElement>) {
    const destino = destinoTecla(activa, event.key)
    if (!destino) return
    event.preventDefault()
    irA(destino, true)
  }

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        movil ? 'gap-(--spacing-bloque-movil)' : 'gap-(--spacing-bloque-gap-admin)',
      )}
    >
      <header className="flex flex-col gap-(--spacing-titulo-pagina-admin)">
        <h1 className={cn(movil ? 't-pagina-movil' : 't-pagina', 'text-negro')}>{textos.titulo}</h1>
        <p className={cn(movil ? 't-control' : 't-subtitulo', 'text-negro')}>{textos.subtitulo}</p>
      </header>

      <div
        role="tablist"
        aria-label={textos.etiquetaPestanas}
        className="flex max-w-full flex-wrap gap-(--spacing-tabs-admin)"
        onKeyDown={alTeclado}
      >
        {PESTANAS.map((pestana) => {
          const seleccionada = pestana === activa
          const etiqueta = pestana === 'secciones' ? textos.secciones : textos.historias
          return (
            <button
              key={pestana}
              ref={(nodo) => {
                botones.current[pestana] = nodo
              }}
              id={idPestana(pestana)}
              type="button"
              role="tab"
              aria-selected={seleccionada}
              aria-controls={idPanel(pestana)}
              tabIndex={seleccionada ? 0 : -1}
              className={cn(
                't-nav text-negro rounded-pill inline-flex min-h-(--size-toque-admin) items-center px-(--spacing-tab-x-admin) py-(--spacing-tab-y-admin) whitespace-nowrap',
                seleccionada ? 'bg-amarillo' : 'hover:bg-crema-tono',
              )}
              onClick={() => irA(pestana, false)}
            >
              {etiqueta}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={idPanel(activa)}
        aria-labelledby={idPestana(activa)}
        className="flex min-w-0 flex-col gap-6"
      >
        {activa === 'secciones' ? (
          <>
            <EditorSecciones
              salidaPendiente={salida !== null}
              onCambioSucio={avisarSecciones}
              onCancelarSalida={() => setSalida(null)}
              onConfirmarSalida={() => {
                if (!salida) return
                const destino = salida
                setSucioSecciones(false)
                setSucioCanales(false)
                setSalida(null)
                aplicar(destino, false)
              }}
            />
            <TarjetaCanales onCambioSucio={avisarCanales} />
          </>
        ) : (
          <PanelHistorias />
        )}
      </div>
    </div>
  )
}
