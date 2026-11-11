import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useCarousel } from '@/hooks/useCarousel'
import { cn } from '@/lib/cn'
import { Carousel } from './Carousel'
import { IconButton } from './IconButton'
import { Photo } from './Photo'

const HUECOS = 3

interface GaleriaFotosProps {
  fotos: readonly string[]
  textoAlt: (numero: number) => string
  textoPendiente: string
}

export function GaleriaFotos({ fotos, textoAlt, textoPendiente }: GaleriaFotosProps) {
  const { t } = useTranslation()
  const [abierta, setAbierta] = useState<number | null>(null)
  const { emblaRef, scrollPrev, scrollNext, canPrev, canNext } = useCarousel()
  const conCarrusel = fotos.length > HUECOS

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
    <div className="min-w-0 flex-1" onKeyDown={alTeclado}>
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
              <BotonFoto src={src} alt={textoAlt(indice + 1)} onAbrir={() => setAbierta(indice)} />
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

function BotonFoto({ src, alt, onAbrir }: { src: string; alt: string; onAbrir: () => void }) {
  return (
    <button
      type="button"
      className="flex w-full min-w-0 flex-1 border-0 bg-transparent p-0"
      onClick={onAbrir}
    >
      <Photo src={src} alt={alt} radius="card" className="h-24 w-full" />
    </button>
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
  const sincronizado = useRef(false)
  const [indice, setIndice] = useState(indiceInicial)
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
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    closeRef.current?.focus()

    const onKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onCloseRef.current()
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
      className="fixed inset-0 z-50 bg-negro"
      onClick={onClose}
    >
      <p id={tituloId} className="t-body absolute top-6 left-6 text-crema" aria-live="polite">
        {t('gallery.counter', { n: indice + 1, total: fotos.length })}
      </p>
      <IconButton
        type="button"
        ref={closeRef}
        aria-label={t('gallery.close')}
        className="absolute top-6 right-6"
        onClick={(evento) => {
          evento.stopPropagation()
          onClose()
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
            'absolute top-1/2 left-6 -translate-y-1/2',
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

      <div className="flex h-full items-center justify-center px-20">
        <div className="w-full" onClick={(evento) => evento.stopPropagation()}>
          <Carousel emblaRef={emblaRef} className="w-full" gapClassName="gap-0">
            {fotos.map((src, posicion) => (
              <div
                key={`${src}-${posicion}`}
                className="flex min-w-0 flex-[0_0_100%] justify-center"
              >
                <Photo
                  src={src}
                  alt={textoAlt(posicion + 1)}
                  radius="card"
                  className="h-auto max-h-[70vh] w-auto max-w-full object-contain"
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
            'absolute top-1/2 right-6 -translate-y-1/2',
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
