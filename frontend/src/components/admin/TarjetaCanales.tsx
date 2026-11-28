import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'
import { Card } from '@/components/ui/Card'
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from '@/components/ui/icons'
import { textosAdmin } from '@/content/textos-admin'
import { cn } from '@/lib/cn'
import { textoVisibleCanal, validarCanal, type ErroresCanal } from '@/schemas/canal-admin'
import {
  actualizarCanal,
  listarCanales,
  type CanalAdmin,
  type TipoCanalAdmin,
} from '@/services/admin/canales.service'

type FilaCanal = {
  url: string
  textoEs: string
}

type TarjetaCanalesProps = {
  onCambioSucio: (sucio: boolean) => void
}

const ICONOS: Record<TipoCanalAdmin, typeof FacebookIcon | typeof Mail> = {
  whatsapp: WhatsAppIcon,
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  tiktok: TikTokIcon,
  email: Mail,
}

function desde(canal: CanalAdmin): FilaCanal {
  return { url: canal.url, textoEs: canal.textoEs ?? '' }
}

function distinto(fila: FilaCanal, canal: CanalAdmin): boolean {
  return (
    fila.url.trim() !== canal.url.trim() ||
    textoVisibleCanal(fila.textoEs) !== textoVisibleCanal(canal.textoEs ?? '')
  )
}

function nombreCanal(tipo: string): string {
  if (tipo in textosAdmin.contenido.nombresCanal) {
    return textosAdmin.contenido.nombresCanal[tipo as TipoCanalAdmin]
  }
  return tipo
}

export function TarjetaCanales({ onCambioSucio }: TarjetaCanalesProps) {
  const textos = textosAdmin.contenido
  const queryClient = useQueryClient()
  const canalesQuery = useQuery({
    queryKey: ['admin-canales'],
    queryFn: listarCanales,
  })
  const [firmaAplicada, setFirmaAplicada] = useState<string | null>(null)
  const [filas, setFilas] = useState<Record<string, FilaCanal>>({})
  const [errores, setErrores] = useState<Record<string, ErroresCanal>>({})
  const [guardando, setGuardando] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const canales = [...(canalesQuery.data ?? [])].sort((a, b) => a.orden - b.orden || a.tipo.localeCompare(b.tipo))
  const firma = canales
    .map((canal) => `${canal.tipo}:${canal.actualizadoEn}:${canal.url}:${canal.textoEs ?? ''}`)
    .join('|')
  const sucio = canales.some((canal) => {
    const fila = filas[canal.tipo]
    return fila ? distinto(fila, canal) : false
  })

  if (canalesQuery.data && firma !== firmaAplicada && !sucio) {
    setFirmaAplicada(firma)
    setFilas(Object.fromEntries(canales.map((canal) => [canal.tipo, desde(canal)])))
    setErrores({})
  }

  useEffect(() => {
    onCambioSucio(sucio)
  }, [onCambioSucio, sucio])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function integrar(guardado: CanalAdmin) {
    queryClient.setQueryData<CanalAdmin[]>(['admin-canales'], (lista) =>
      lista?.map((item) => (item.tipo === guardado.tipo ? guardado : item)),
    )
    setFilas((actual) => ({ ...actual, [guardado.tipo]: desde(guardado) }))
  }

  async function guardar() {
    if (guardando || !sucio) return
    const cambiados = canales.filter((canal) => {
      const fila = filas[canal.tipo]
      return fila ? distinto(fila, canal) : false
    })
    const locales: Record<string, ErroresCanal> = {}
    for (const canal of cambiados) {
      const fila = filas[canal.tipo]
      if (!fila) continue
      const error = validarCanal(fila)
      if (error) locales[canal.tipo] = error
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setGuardando(true)
    setErrores({})
    const fallos: Record<string, ErroresCanal> = {}
    try {
      for (const canal of cambiados) {
        const fila = filas[canal.tipo]
        if (!fila) continue
        try {
          const guardado = await actualizarCanal(canal, {
            url: fila.url.trim(),
            textoEs: textoVisibleCanal(fila.textoEs),
          })
          integrar(guardado)
        } catch (error) {
          fallos[canal.tipo] = {
            url: error instanceof Error ? error.message : textosAdmin.supuestos.noGuardado,
          }
        }
      }
      setErrores(fallos)
      if (Object.keys(fallos).length === 0) {
        setToast(textosAdmin.supuestos.guardado)
        await queryClient.invalidateQueries({ queryKey: ['public-contacts'] })
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card radius="admin" elevated="panel" className="flex w-full min-w-0 flex-col gap-4 p-7">
      <header className="flex flex-col gap-1">
        <h2 className="t-heading-md text-negro">{textos.canalesTitulo}</h2>
        <p className="t-small text-texto-secundario">{textos.canalesNota}</p>
      </header>

      {canalesQuery.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-label={textosAdmin.supuestos.cargando}>
          <div className="bg-crema-tono h-11 animate-pulse rounded-btn" />
          <div className="bg-crema-tono h-11 animate-pulse rounded-btn" />
          <div className="bg-crema-tono h-11 animate-pulse rounded-btn" />
        </div>
      ) : canalesQuery.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="t-body text-negro" role="alert">
            {canalesQuery.error instanceof Error
              ? canalesQuery.error.message
              : textosAdmin.supuestos.error}
          </p>
          <BotonPildora variante="ghost" onClick={() => void canalesQuery.refetch()}>
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : canales.length === 0 ? (
        <p className="t-body text-negro">{textosAdmin.supuestos.vacio}</p>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            void guardar()
          }}
        >
          <div className="flex gap-4">
            <span className="w-(--spacing-canal-nombre) shrink-0" />
            <span className="t-small text-texto-secundario min-w-0 flex-1">{textos.enlace}</span>
            <span className="t-small text-texto-secundario w-(--spacing-canal-texto) shrink-0">
              {textos.textoVisible}
            </span>
          </div>

          {canales.map((canal) => {
            const fila = filas[canal.tipo] ?? desde(canal)
            const error = errores[canal.tipo]
            const Icono = ICONOS[canal.tipo]
            const nombre = nombreCanal(canal.tipo)
            const idUrl = `canal-${canal.tipo}-url`
            const idTexto = `canal-${canal.tipo}-texto`
            return (
              <div key={canal.tipo} className="flex flex-col gap-1">
                <div className="flex items-center gap-4">
                  <div className="flex w-(--spacing-canal-nombre) shrink-0 items-center gap-2.5">
                    <span className="bg-crema-tono flex size-10 items-center justify-center rounded-full text-negro">
                      {Icono ? <Icono className="size-4.5" /> : null}
                    </span>
                    <span className="t-nav font-semibold text-negro">{nombre}</span>
                  </div>
                  <input
                    id={idUrl}
                    aria-label={`${nombre} ${textos.enlace}`}
                    value={fila.url}
                    maxLength={500}
                    aria-invalid={error?.url ? true : undefined}
                    aria-describedby={error?.url ? `${idUrl}-error` : undefined}
                    onChange={(event) => {
                      setFilas((actual) => ({
                        ...actual,
                        [canal.tipo]: { ...fila, url: event.target.value },
                      }))
                      setErrores((actual) => ({ ...actual, [canal.tipo]: { ...actual[canal.tipo], url: undefined } }))
                      setToast(null)
                    }}
                    className="rounded-admin-control border-linea t-control text-negro placeholder:text-placeholder h-(--size-control-admin) min-w-0 flex-1 border bg-blanco px-4"
                  />
                  <input
                    id={idTexto}
                    aria-label={`${nombre} ${textos.textoVisible}`}
                    value={fila.textoEs}
                    maxLength={200}
                    lang="es"
                    aria-invalid={error?.textoEs ? true : undefined}
                    aria-describedby={error?.textoEs ? `${idTexto}-error` : undefined}
                    onChange={(event) => {
                      setFilas((actual) => ({
                        ...actual,
                        [canal.tipo]: { ...fila, textoEs: event.target.value },
                      }))
                      setErrores((actual) => ({
                        ...actual,
                        [canal.tipo]: { ...actual[canal.tipo], textoEs: undefined },
                      }))
                      setToast(null)
                    }}
                    className="rounded-admin-control border-linea t-control text-negro placeholder:text-placeholder h-(--size-control-admin) w-(--spacing-canal-texto) shrink-0 border bg-blanco px-4"
                  />
                </div>
                {error?.url ? (
                  <p id={`${idUrl}-error`} className={cn('t-small text-naranja pl-[calc(var(--spacing-canal-nombre)+1rem)]')} role="alert">
                    {error.url}
                  </p>
                ) : null}
                {error?.textoEs ? (
                  <p id={`${idTexto}-error`} className="t-small text-naranja" role="alert">
                    {error.textoEs}
                  </p>
                ) : null}
              </div>
            )
          })}

          <div className="flex justify-end">
            <BotonPildora type="submit" disabled={!sucio || guardando} aria-busy={guardando}>
              {guardando ? textosAdmin.supuestos.guardando : textos.guardarCanales}
            </BotonPildora>
          </div>
        </form>
      )}

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
