import { useEffect, useId, useRef, useState } from 'react'
import { textosAdmin } from '@/content/textos-admin'
import { validarImagen } from '@/schemas/imagen'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'

type ReemplazarImagenProps = {
  /** URL pública actual. Vacía muestra el recuadro gris. */
  src: string | null
  /** Archivo elegido, todavía sin subir. Lo guarda quien llama, al guardar el bloque. */
  archivo: File | null
  onArchivo: (archivo: File | null) => void
}

export function ReemplazarImagen({ src, archivo, onArchivo }: ReemplazarImagenProps) {
  const id = useId()
  const notaId = `${id}-nota`
  const errorId = `${id}-error`
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<{ archivo: File | null; url: string | null }>({
    archivo: null,
    url: null,
  })
  const textos = textosAdmin.contenido

  if (archivo !== vista.archivo) {
    setVista({
      archivo,
      url: archivo ? URL.createObjectURL(archivo) : null,
    })
  }

  useEffect(() => {
    const url = vista.url
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [vista.url])

  function elegir(lista: FileList | null) {
    const elegido = lista?.[0]
    if (!elegido) return
    const mensaje = validarImagen(elegido)
    if (mensaje) {
      setError(mensaje)
      onArchivo(null)
      return
    }
    setError(null)
    onArchivo(elegido)
  }

  const visible = vista.url ?? src

  return (
    <div className="flex w-full items-center gap-4">
      <div className="border-linea bg-crema-tono h-(--size-miniatura-contenido) w-(--spacing-miniatura-contenido) shrink-0 overflow-hidden rounded-admin-control border">
        {visible ? (
          <img src={visible} alt={textos.altImagen} className="size-full object-cover" />
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col items-start gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <input
            id={id}
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-describedby={error ? `${notaId} ${errorId}` : notaId}
            onChange={(event) => {
              elegir(event.target.files)
              event.target.value = ''
            }}
          />
          <BotonPildora variante="ghost" onClick={() => inputRef.current?.click()}>
            {textos.reemplazarImagen}
          </BotonPildora>
          {archivo ? (
            <BotonPildora
              variante="ghost"
              onClick={() => {
                setError(null)
                onArchivo(null)
              }}
            >
              {textos.descartarImagen}
            </BotonPildora>
          ) : null}
        </div>

        <p id={notaId} className="t-small text-texto-secundario">
          {textos.notaImagen}
        </p>
        {error ? (
          <p id={errorId} className="t-small text-red-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  )
}
