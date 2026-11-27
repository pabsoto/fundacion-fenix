import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'
import { textosAdmin } from '@/content/textos-admin'
import { isValidFacebookPageUrl } from '@/services/contacts.service'
import {
  actualizarUrlFacebook,
  getCanalFacebook,
  type CanalFacebookAdmin,
} from '@/services/admin/canales.service'

export function AdminCanalesPage() {
  const queryClient = useQueryClient()
  const [url, setUrl] = useState<string | null>(null)
  const [errorUrl, setErrorUrl] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const canalQuery = useQuery({
    queryKey: ['admin-canal-facebook'],
    queryFn: getCanalFacebook,
  })
  const actualizacion = useMutation({
    mutationFn: ({
      canal,
      urlNueva,
    }: {
      canal: CanalFacebookAdmin
      urlNueva: string
    }) => actualizarUrlFacebook(canal, urlNueva),
    onSuccess: async (canal) => {
      queryClient.setQueryData(['admin-canal-facebook'], canal)
      setUrl(canal.url)
      setGuardado(true)
      await queryClient.invalidateQueries({ queryKey: ['public-contacts'] })
    },
  })

  function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorUrl(null)
    setGuardado(false)

    const urlNormalizada = (url ?? canalQuery.data?.url ?? '').trim()
    if (!isValidFacebookPageUrl(urlNormalizada)) {
      setErrorUrl(textosAdmin.canales.urlInvalida)
      return
    }
    if (!canalQuery.data) return
    actualizacion.mutate({ canal: canalQuery.data, urlNueva: urlNormalizada })
  }

  const errorApi =
    actualizacion.error instanceof Error
      ? actualizacion.error.message
      : textosAdmin.supuestos.error

  return (
    <section className="flex w-full max-w-3xl flex-col items-start gap-6 rounded-card border border-linea bg-blanco p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h2 className="t-heading-card text-negro">{textosAdmin.canales.titulo}</h2>
        <p className="t-body text-negro">{textosAdmin.canales.subtitulo}</p>
      </header>

      {canalQuery.isPending ? (
        <p className="t-body text-negro" role="status">{textosAdmin.supuestos.cargando}</p>
      ) : canalQuery.isError ? (
        <div className="flex flex-col items-start gap-4">
          <p className="t-body text-negro" role="alert">
            {canalQuery.error instanceof Error
              ? canalQuery.error.message
              : textosAdmin.supuestos.error}
          </p>
          <BotonPildora variante="ghost" onClick={() => void canalQuery.refetch()}>
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : (
        <form
          onSubmit={guardar}
          className="flex w-full flex-col items-start gap-6"
        >
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="url-facebook" className="t-body-strong text-negro">
              {textosAdmin.canales.facebookUrl}
            </label>
            <input
              id="url-facebook"
              type="url"
              required
              maxLength={500}
              value={url ?? canalQuery.data.url}
              onChange={(event) => {
                setUrl(event.target.value)
                setGuardado(false)
                setErrorUrl(null)
              }}
              aria-invalid={Boolean(errorUrl)}
              aria-describedby={errorUrl ? 'error-url-facebook' : 'ayuda-url-facebook'}
              className="min-h-12 w-full rounded-btn border border-linea bg-blanco px-4 text-negro"
            />
            <p id="ayuda-url-facebook" className="t-small text-negro">
              {textosAdmin.canales.ayudaUrl}
            </p>
            {errorUrl && (
              <p id="error-url-facebook" className="t-small text-red-700" role="alert">
                {errorUrl}
              </p>
            )}
          </div>

          {!canalQuery.data.activo && (
            <p className="t-small text-negro" role="status">
              {textosAdmin.canales.inactivo}
            </p>
          )}
          {actualizacion.isError && (
            <p className="t-small text-red-700" role="alert">{errorApi}</p>
          )}
          {guardado && (
            <p className="t-small text-negro" role="status">
              {textosAdmin.canales.guardado}
            </p>
          )}

          <BotonPildora
            type="submit"
            disabled={
              actualizacion.isPending ||
              (url ?? canalQuery.data.url).trim() === canalQuery.data.url
            }
          >
            {actualizacion.isPending
              ? textosAdmin.supuestos.guardando
              : textosAdmin.canales.guardar}
          </BotonPildora>
        </form>
      )}
    </section>
  )
}
