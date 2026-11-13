import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, X, ZoomIn } from 'lucide-react'
import { useCarousel } from '@/hooks/useCarousel'
import { cn } from '@/lib/cn'
import { Carousel } from './Carousel'
import { IconButton } from './IconButton'
import { Photo } from './Photo'
import './GaleriaFotos.css'

const HUECOS = 3
const PISTA_CLAVE = 'fenix-galeria-pista-vista'
const PISTA_RETRASO_MS = 1000
const PISTA_UMBRAL = 0.6
const CIERRE_MS = 180

interface GaleriaFotosProps {
  fotos: readonly string[]
  textoAlt: (numero: number) => string
  textoPendiente: string
}

export function GaleriaFotos({ fotos, textoAlt, textoPendiente }: GaleriaFotosProps) {
  const { t } = useTranslation()
  const raizRef = useRef<HTMLDivElement>(null)
  const timerPistaRef = useRef(0)
  const pistaDescartadaRef = useRef(false)
  const [abierta, setAbierta] = useState<number | null>(null)
  const [pista, setPista] = useState(false)
  const { emblaRef, scrollPrev, scrollNext, canPrev, canNext } = useCarousel()
  const conCarrusel = fotos.length > HUECOS

  const descartarPista = () => {
    if (pistaDescartadaRef.current) return
    pistaDescartadaRef.current = true
    window.clearTimeout(timerPistaRef.current)
    setPista(false)
    try {
      sessionStorage.setItem(PISTA_CLAVE, '1')
    } catch {
      /* sesión no disponible */
    }
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PISTA_CLAVE) === '1') {
        pistaDescartadaRef.current = true
        return
      }
    } catch {
      pistaDescartadaRef.current = true
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const nodo = raizRef.current
    if (!nodo) return

    const observer = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.some(
          (entrada) => entrada.isIntersecting && entrada.intersectionRatio >= PISTA_UMBRAL
        )
        if (!visible || pistaDescartadaRef.current) return
        observer.disconnect()
        timerPistaRef.current = window.setTimeout(() => {
          if (pistaDescartadaRef.current) return
          if (nodo.matches(':hover') || nodo.matches(':focus-within')) {
            pistaDescartadaRef.current = true
            try {
              sessionStorage.setItem(PISTA_CLAVE, '1')
            } catch {
              /* sesión no disponible */
            }
            return
          }
          setPista(true)
        }, PISTA_RETRASO_MS)
      },
      { threshold: PISTA_UMBRAL }
    )
    observer.observe(nodo)
    return () => {
      observer.disconnect()
      window.clearTimeout(timerPistaRef.current)
    }
  }, [])

  const alTeclado = (evento: React.KeyboardEvent) => {
    if (!conCarrusel || abierta !== null) return
    if (evento.key === 'ArrowLeft') {
      evento.preventDefault()
      scrollPrev()
    } else if (evento.key === 'ArrowRight') {
      evento.preventDefault()
      scrollNext()
    }
  }

  return (
    <div ref={raizRef} className="min-w-0 flex-1" onKeyDown={alTeclado}>
      {conCarrusel && (
        <div className="mb-3 flex justify-end gap-3">
          <IconButton
            type="button"
            aria-label={t('gallery.prev')}
            onClick={scrollPrev}
            disabled={!canPrev}
            className={cn(!canPrev && 'cursor-not-allowed opacity-40')}
          >
            <ArrowLeft className="h-5 w-5 text-negro" aria-hidden />
          </IconButton>
          <IconButton
            type="button"
            aria-label={t('gallery.next')}
            onClick={scrollNext}
            disabled={!canNext}
            className={cn(!canNext && 'cursor-not-allowed opacity-40')}
          >
            <ArrowRight className="h-5 w-5 text-negro" aria-hidden />
          </IconButton>
        </div>
      )}

      {conCarrusel ? (
        <Carousel emblaRef={emblaRef} gapClassName="gap-3">
          {fotos.map((src, indice) => (
            <div
              key={`${src}-${indice}`}
              className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_calc(50%-6px)] lg:flex-[0_0_calc(33.333%-8px)]"
            >
              <BotonFoto
                src={src}
                alt={textoAlt(indice + 1)}
                etiqueta={t('gallery.zoom', { n: indice + 1, total: fotos.length })}
                pista={pista && indice === 0}
                onInteraccion={descartarPista}
                onAbrir={() => setAbierta(indice)}
              />
            </div>
          ))}
        </Carousel>
      ) : (
        <div className="flex min-w-0 gap-3">
          {Array.from({ length: HUECOS }, (_, indice) => {
            const src = fotos[indice]
            if (!src) {
              return <HuecoPendiente key={`vacio-${indice}`} texto={textoPendiente} />
            }
            return (
              <BotonFoto
                key={`${src}-${indice}`}
                src={src}
                alt={textoAlt(indice + 1)}
                etiqueta={t('gallery.zoom', { n: indice + 1, total: fotos.length })}
                pista={pista && indice === 0}
                onInteraccion={descartarPista}
                onAbrir={() => setAbierta(indice)}
              />
            )
          })}
        </div>
      )}

      {abierta !== null && (
        <VisorFotos
          fotos={fotos}
          indiceInicial={abierta}
          textoAlt={textoAlt}
          onClose={() => setAbierta(null)}
        />
      )}
    </div>
  )
}

function HuecoPendiente({ texto }: { texto: string }) {
  return (
    <div className="flex h-24 min-w-0 flex-1 items-center justify-center rounded-card bg-linea">
      <span className="t-nav text-negro">{texto}</span>
    </div>
  )
}

function BotonFoto({
  src,
  alt,
  etiqueta,
  pista,
  onInteraccion,
  onAbrir,
}: {
  src: string
  alt: string
  etiqueta: string
  pista: boolean
  onInteraccion: () => void
  onAbrir: () => void
}) {
  return (
    <button
      type="button"
      className="galeria-miniatura flex w-full min-w-0 flex-1 border-0 bg-transparent p-0"
      aria-label={etiqueta}
      onMouseEnter={onInteraccion}
      onFocus={onInteraccion}
      onClick={() => {
        onInteraccion()
        onAbrir()
      }}
    >
      <span className="galeria-miniatura__marco">
        <span className={cn('galeria-miniatura__escala', pista && 'galeria-miniatura__escala--pista')}>
          <Photo src={src} alt={alt} radius="card" className="h-24 w-full" />
        </span>
        {pista && (
          <>
            <span className="galeria-onda" aria-hidden="true" />
            <PunteroClick />
          </>
        )}
        <span className="galeria-miniatura__lupa" aria-hidden="true">
          <ZoomIn className="h-3.5 w-3.5" />
        </span>
      </span>
    </button>
  )
}

function PunteroClick() {
  return (
    <svg className="galeria-puntero" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.2 3.2v12.4l3.2-3 2.3 5.2 2.2-.9-2.3-5.1h4.4L5.2 3.2z"
        fill="var(--color-blanco)"
        stroke="var(--color-negro)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VisorFotos({
  fotos,
  indiceInicial,
  textoAlt,
  onClose,
}: {
  fotos: readonly string[]
  indiceInicial: number
  textoAlt: (numero: number) => string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const tituloId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const cerrandoRef = useRef(false)
  const sincronizado = useRef(false)
  const [indice, setIndice] = useState(indiceInicial)
  const [cerrando, setCerrando] = useState(false)
  const { emblaRef, scrollTo, selectedIndex } = useCarousel({
    align: 'start',
    containScroll: false,
    startIndex: indiceInicial,
  })
  const varias = fotos.length > 1

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!sincronizado.current) {
      if (selectedIndex === indiceInicial) sincronizado.current = true
      return
    }
    setIndice(selectedIndex)
  }, [selectedIndex, indiceInicial])

  useEffect(() => {
    scrollTo(indice)
  }, [indice, scrollTo])

  useEffect(() => {
    const cuerpo = document.body
    const overflowPrevio = cuerpo.style.overflow
    const paddingPrevio = cuerpo.style.paddingRight
    const compensacion = window.innerWidth - document.documentElement.clientWidth
    cuerpo.style.overflow = 'hidden'
    if (compensacion > 0) {
      const base = Number.parseFloat(paddingPrevio) || 0
      cuerpo.style.paddingRight = `${base + compensacion}px`
    }
    return () => {
      cuerpo.style.overflow = overflowPrevio
      cuerpo.style.paddingRight = paddingPrevio
    }
  }, [])

  useEffect(() => {
    if (!cerrando) return
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = window.setTimeout(() => onCloseRef.current(), reducido ? 0 : CIERRE_MS)
    return () => window.clearTimeout(id)
  }, [cerrando])

  const cerrar = () => {
    if (cerrandoRef.current) return
    cerrandoRef.current = true
    setCerrando(true)
  }

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        cerrar()
        return
      }
      if (evento.key === 'ArrowLeft') {
        evento.preventDefault()
        setIndice((actual) => Math.max(0, actual - 1))
        return
      }
      if (evento.key === 'ArrowRight') {
        evento.preventDefault()
        setIndice((actual) => Math.min(fotos.length - 1, actual + 1))
        return
      }
      if (evento.key !== 'Tab' || !dialogRef.current) return
      const items = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      )
      if (!items.length) return
      const primero = items[0]
      const ultimo = items[items.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previo?.focus()
    }
  }, [fotos.length])

  const paso = (delta: number) => {
    setIndice((actual) => Math.min(fotos.length - 1, Math.max(0, actual + delta)))
  }

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      className={cn('galeria-visor', cerrando && 'galeria-visor--salida')}
      onClick={cerrar}
    >
      <div className="galeria-visor__velo" />
      <p id={tituloId} className="galeria-visor__contador t-body" aria-live="polite">
        {t('gallery.counter', { n: indice + 1, total: fotos.length })}
      </p>
      <IconButton
        type="button"
        ref={closeRef}
        aria-label={t('gallery.close')}
        className="galeria-visor__control absolute top-6 right-6"
        onClick={(evento) => {
          evento.stopPropagation()
          cerrar()
        }}
      >
        <X className="h-5 w-5 text-negro" aria-hidden />
      </IconButton>

      {varias && (
        <IconButton
          type="button"
          aria-label={t('gallery.prev')}
          disabled={indice === 0}
          className={cn(
            'galeria-visor__control absolute top-1/2 left-3 -translate-y-1/2 sm:left-6',
            indice === 0 && 'cursor-not-allowed opacity-40'
          )}
          onClick={(evento) => {
            evento.stopPropagation()
            paso(-1)
          }}
        >
          <ArrowLeft className="h-5 w-5 text-negro" aria-hidden />
        </IconButton>
      )}

      <div className="galeria-visor__escena">
        <div className="galeria-visor__foto" onClick={(evento) => evento.stopPropagation()}>
          <Carousel emblaRef={emblaRef} className="w-full" gapClassName="gap-0">
            {fotos.map((src, posicion) => (
              <div
                key={`${src}-${posicion}`}
                className="flex min-w-0 flex-[0_0_100%] justify-center px-3 py-4"
              >
                <Photo
                  src={src}
                  alt={textoAlt(posicion + 1)}
                  radius="card"
                  className="h-auto max-h-[80vh] w-auto max-w-full object-contain shadow-soft"
                />
              </div>
            ))}
          </Carousel>
        </div>
      </div>

      {varias && (
        <IconButton
          type="button"
          aria-label={t('gallery.next')}
          disabled={indice === fotos.length - 1}
          className={cn(
            'galeria-visor__control absolute top-1/2 right-3 -translate-y-1/2 sm:right-6',
            indice === fotos.length - 1 && 'cursor-not-allowed opacity-40'
          )}
          onClick={(evento) => {
            evento.stopPropagation()
            paso(1)
          }}
        >
          <ArrowRight className="h-5 w-5 text-negro" aria-hidden />
        </IconButton>
      )}
    </div>,
    document.body
  )
}
