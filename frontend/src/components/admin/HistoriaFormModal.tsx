import { useEffect, useId, useRef, useState } from 'react'
import { Calendar } from 'lucide-react'
import { BotonPildora } from '@/components/admin/ui/BotonPildora'
import { CampoTexto } from '@/components/admin/ui/CampoTexto'
import { Interruptor } from '@/components/admin/ui/Interruptor'
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin'
import { ZonaFotos, type FotoExistente } from '@/components/admin/ui/ZonaFotos'
import { TarjetaHistoria } from '@/sections/results/Stories'
import { textosAdmin } from '@/content/textos-admin'
import { medirFoto } from '@/lib/medir-foto'
import {
  validarHistoria,
  type DatosHistoria,
  type ErroresHistoria,
  type FormularioHistoria,
} from '@/schemas/historia'
import type { HistoriaAdmin } from '@/services/admin/historias.service'
import type { Story } from '@/types'

type HistoriaFormModalProps = {
  historia: HistoriaAdmin | null
  guardando: boolean
  error: string | null
  onCerrar: () => void
  onGuardar: (datos: DatosHistoria) => void
}

function vacio(): FormularioHistoria {
  return {
    animalNombre: '',
    tituloEs: '',
    tituloEn: '',
    textoEs: '',
    textoEn: '',
    autorNombre: '',
    fechaHistoria: '',
    visible: false,
    foto: null,
  }
}

function desde(historia: HistoriaAdmin | null): FormularioHistoria {
  if (!historia) return vacio()
  return {
    animalNombre: historia.animalNombre,
    tituloEs: historia.tituloEs,
    tituloEn: historia.tituloEn,
    textoEs: historia.textoEs,
    textoEn: historia.textoEn,
    autorNombre: historia.autorNombre ?? '',
    fechaHistoria: historia.fechaHistoria,
    visible: historia.visible,
    foto: null,
  }
}

export function HistoriaFormModal({
  historia,
  guardando,
  error,
  onCerrar,
  onGuardar,
}: HistoriaFormModalProps) {
  const textos = textosAdmin.contenido.historiasForm
  const baseId = useId()
  const [formulario, setFormulario] = useState<FormularioHistoria>(() => desde(historia))
  const [errores, setErrores] = useState<ErroresHistoria>({})
  const [idioma, setIdioma] = useState<'es' | 'en'>('es')
  const [local, setLocal] = useState<{ url: string; ancho?: number; alto?: number } | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  function asignar<K extends keyof FormularioHistoria>(campo: K, valor: FormularioHistoria[K]) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }))
  }

  async function alElegirFoto(archivos: File[]) {
    const archivo = archivos[0] ?? null
    asignar('foto', archivo)
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    if (!archivo) {
      urlRef.current = null
      setLocal(null)
      return
    }
    const url = URL.createObjectURL(archivo)
    urlRef.current = url
    setLocal({ url })
    const medidas = await medirFoto(archivo)
    if (urlRef.current !== url) return
    if (medidas) setLocal({ url, ancho: medidas.ancho, alto: medidas.alto })
  }

  function guardar() {
    if (guardando) return
    const resultado = validarHistoria(formulario, Boolean(historia?.foto))
    if (!resultado.ok) {
      setErrores(resultado.errores)
      return
    }
    setErrores({})
    onGuardar(resultado.datos)
  }

  const fotoUrl = local?.url ?? historia?.foto?.url
  const vista: Story = {
    id: historia?.id ?? 'vista-previa',
    animalName: formulario.animalNombre,
    title: { es: formulario.tituloEs, en: formulario.tituloEn },
    text: { es: formulario.textoEs, en: formulario.textoEn },
    author: formulario.autorNombre.trim() || undefined,
    date: formulario.fechaHistoria,
    photo: fotoUrl,
    photoWidth: local?.ancho ?? historia?.foto?.ancho,
    photoHeight: local?.alto ?? historia?.foto?.alto,
  }
  const existentes: FotoExistente[] = historia?.foto
    ? [{ clave: 'actual', src: historia.foto.url, nombre: textos.miniatura(historia.animalNombre) }]
    : []

  return (
    <ModalAdmin
      abierto
      titulo={historia ? textos.editarTitulo : textos.nueva}
      onCerrar={() => {
        if (!guardando) onCerrar()
      }}
      pie={
        <>
          <BotonPildora variante="ghost" disabled={guardando} onClick={onCerrar}>
            {textosAdmin.supuestos.cancelar}
          </BotonPildora>
          <BotonPildora disabled={guardando} aria-busy={guardando} onClick={guardar}>
            {guardando
              ? textosAdmin.supuestos.guardando
              : historia
                ? textos.guardarCambios
                : textos.guardar}
          </BotonPildora>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          guardar()
        }}
      >
        <CampoTexto
          id={`${baseId}-animal`}
          etiqueta={textos.animal}
          valor={formulario.animalNombre}
          placeholder={textos.animalPlaceholder}
          error={errores.animalNombre}
          deshabilitado={guardando}
          onChange={(valor) => asignar('animalNombre', valor)}
        />
        <CampoTexto
          id={`${baseId}-titulo-es`}
          etiqueta={textos.titulo}
          valor={formulario.tituloEs}
          error={errores.tituloEs}
          idioma="es"
          deshabilitado={guardando}
          onChange={(valor) => asignar('tituloEs', valor)}
        />
        <CampoTexto
          id={`${baseId}-titulo-en`}
          etiqueta={textos.tituloEn}
          valor={formulario.tituloEn}
          error={errores.tituloEn}
          idioma="en"
          deshabilitado={guardando}
          onChange={(valor) => asignar('tituloEn', valor)}
        />
        <CampoTexto
          id={`${baseId}-texto-es`}
          etiqueta={textos.texto}
          valor={formulario.textoEs}
          multilinea
          error={errores.textoEs}
          idioma="es"
          deshabilitado={guardando}
          onChange={(valor) => asignar('textoEs', valor)}
        />
        <CampoTexto
          id={`${baseId}-texto-en`}
          etiqueta={textos.textoEn}
          valor={formulario.textoEn}
          multilinea
          error={errores.textoEn}
          idioma="en"
          deshabilitado={guardando}
          onChange={(valor) => asignar('textoEn', valor)}
        />
        <CampoTexto
          id={`${baseId}-autor`}
          etiqueta={textos.autor}
          valor={formulario.autorNombre}
          error={errores.autorNombre}
          deshabilitado={guardando}
          onChange={(valor) => asignar('autorNombre', valor)}
        />
        <CampoTexto
          id={`${baseId}-fecha`}
          etiqueta={textos.fecha}
          tipo="date"
          valor={formulario.fechaHistoria}
          placeholder={textos.fechaPlaceholder}
          error={errores.fechaHistoria}
          deshabilitado={guardando}
          icono={<Calendar className="size-4" aria-hidden="true" />}
          onChange={(valor) => asignar('fechaHistoria', valor)}
        />
        <div className="flex flex-col gap-2">
          <p className="t-chip text-negro">{textos.foto}</p>
          <ZonaFotos
            id={`${baseId}-foto`}
            texto={textos.foto}
            nota={textos.notaFoto}
            archivos={formulario.foto ? [formulario.foto] : []}
            existentes={formulario.foto ? [] : existentes}
            onArchivos={(archivos) => void alElegirFoto(archivos)}
          />
          {errores.foto ? (
            <p className="t-small text-naranja" role="alert">
              {errores.foto}
            </p>
          ) : null}
        </div>
        <Interruptor
          id={`${baseId}-visible`}
          etiqueta={textos.visible}
          nota={textos.visibleNota}
          activo={formulario.visible}
          onChange={(activo) => {
            if (!guardando) asignar('visible', activo)
          }}
        />
        <p className="t-small text-texto-secundario">{textos.notaAutorizacion}</p>
        {error ? (
          <p className="t-small text-naranja" role="alert">
            {error}
          </p>
        ) : null}

        <div className="border-linea flex flex-col gap-3 border-t pt-4">
          <p className="t-eyebrow text-texto-secundario">{textosAdmin.contenido.vista}</p>
          <div className="flex gap-2" role="group" aria-label={textosAdmin.contenido.vista}>
            <button
              type="button"
              aria-pressed={idioma === 'es'}
              className={
                idioma === 'es'
                  ? 't-chip rounded-pill bg-negro text-crema px-3.5 py-2'
                  : 't-chip border-linea rounded-pill bg-blanco text-negro border px-3.5 py-2'
              }
              onClick={() => setIdioma('es')}
            >
              {textosAdmin.contenido.idiomaEs}
            </button>
            <button
              type="button"
              aria-pressed={idioma === 'en'}
              className={
                idioma === 'en'
                  ? 't-chip rounded-pill bg-negro text-crema px-3.5 py-2'
                  : 't-chip border-linea rounded-pill bg-blanco text-negro border px-3.5 py-2'
              }
              onClick={() => setIdioma('en')}
            >
              {textosAdmin.contenido.idiomaEn}
            </button>
          </div>
          <TarjetaHistoria story={vista} lang={idioma} encajarFoto className="w-full" />
        </div>
      </form>
    </ModalAdmin>
  )
}
