import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, Trash2, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { validarCampana, type CampanaFormulario, type ErroresCampana } from '@/schemas/campana';
import {
  deleteCampana,
  guardarCampana,
  quitarFotoCampana,
  subirFotosCampana,
} from '@/services/admin/campanas.service';
import { ErrorApiAdmin } from '@/services/admin/cliente-admin';
import type { CampanaConTotales } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { CampoTexto } from '@/components/admin/ui/CampoTexto';
import { ConfirmarEliminarModal } from '@/components/admin/ui/ConfirmarEliminarModal';
import { Interruptor } from '@/components/admin/ui/Interruptor';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';
import { ZonaFotos, type FotoExistente } from '@/components/admin/ui/ZonaFotos';

type FotoGuardada = {
  clave: string;
  valor: string;
};

type CampanaFormModalProps = {
  campana: CampanaConTotales | null;
  onCerrar: () => void;
  onGuardada: (id: string, fotosFallidas: File[] | null) => void;
  onEliminada: () => void;
  /** En móvil el formulario ocupa la pantalla, con la barra de acciones fija. */
  pantallaCompleta?: boolean;
};

const VACIO: CampanaFormulario = {
  titulo: '',
  lugar: '',
  fecha: '',
  descripcion: '',
  publicada: true,
  perrosMachos: '',
  perrosHembras: '',
  gatosMachos: '',
  gatosHembras: '',
  fotos: [],
};

function formularioDe(campana: CampanaConTotales | null): CampanaFormulario {
  if (!campana) return VACIO;
  return {
    titulo: campana.titulo,
    lugar: campana.lugar ?? '',
    fecha: campana.fecha ?? '',
    descripcion: campana.descripcion ?? '',
    publicada: campana.estado !== 'borrador',
    perrosMachos: String(campana.perrosMachos),
    perrosHembras: String(campana.perrosHembras),
    gatosMachos: String(campana.gatosMachos),
    gatosHembras: String(campana.gatosHembras),
    fotos: [],
  };
}

function fotosDe(campana: CampanaConTotales | null): FotoGuardada[] {
  if (!campana) return [];
  return campana.fotos.map((valor, indice) => ({ clave: `${indice}-${valor}`, valor }));
}

function fuenteVisible(valor: string): string | null {
  if (
    valor.startsWith('blob:') ||
    valor.startsWith('data:') ||
    valor.startsWith('http') ||
    valor.startsWith('/')
  ) {
    return valor;
  }
  return null;
}

function PantallaCampana({
  titulo,
  subtitulo,
  onCerrar,
  pie,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  pie?: React.ReactNode;
  children: React.ReactNode;
  abierto?: boolean;
}) {
  return createPortal(
    <div className="bg-crema fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top,0px)]">
      <header className="flex items-center gap-3 px-4 py-1.5">
        <button
          type="button"
          className="border-linea flex size-11 items-center justify-center rounded-pill border"
          aria-label={textosAdmin.nuevaCampana.cerrar}
          onClick={onCerrar}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h1 className="t-pantalla-movil text-negro">{titulo}</h1>
      </header>
      <div className="bg-linea h-px" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-4">
        {subtitulo ? <p className="t-control text-negro mb-5">{subtitulo}</p> : null}
        {children}
      </div>
      <div className="border-linea bg-blanco flex items-center gap-3 border-t px-4 pt-3 pb-[max(2.125rem,env(safe-area-inset-bottom,0px))]">
        {pie}
      </div>
    </div>,
    document.body,
  );
}

function ConfirmacionEliminarMovil({
  titulo,
  cuerpo,
  accion,
  cancelar,
  borrando,
  error,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  cuerpo: string;
  accion: string;
  cancelar: string;
  borrando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const tituloId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef(onCancelar);

  useEffect(() => {
    cancelarRef.current = onCancelar;
  }, [onCancelar]);

  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function alTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape' && !borrando) {
        event.preventDefault();
        cancelarRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodo = dialogRef.current;
      if (!nodo) return;
      const lista = [...nodo.querySelectorAll<HTMLElement>('button:not([disabled])')];
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (!primero || !ultimo) return;
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener('keydown', alTeclado);
    return () => {
      document.removeEventListener('keydown', alTeclado);
      previo?.focus();
    };
  }, [borrando]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <button
        type="button"
        className="bg-velo absolute inset-0"
        aria-label={cancelar}
        disabled={borrando}
        onClick={onCancelar}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="border-linea bg-blanco relative flex w-full flex-col gap-5 rounded-admin border p-6 outline-none"
      >
        <div className="flex flex-col gap-2">
          <h2 id={tituloId} className="t-total-detalle text-negro">
            {titulo}
          </h2>
          <p className="t-control text-negro">{cuerpo}</p>
        </div>
        {error ? (
          <p className="t-small text-naranja" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <BotonPildora
            variante="ghost"
            className="h-(--size-control-admin) w-full"
            disabled={borrando}
            onClick={onCancelar}
          >
            {cancelar}
          </BotonPildora>
          <BotonPildora
            variante="peligroSolido"
            className="h-(--size-control-admin) w-full"
            disabled={borrando}
            aria-busy={borrando}
            onClick={onConfirmar}
          >
            {borrando ? textosAdmin.supuestos.guardando : accion}
          </BotonPildora>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function sumaContadores(valores: string[]): number {
  return valores.reduce((total, valor) => {
    const limpio = valor.trim();
    if (!/^\d+$/.test(limpio)) return total;
    const numero = Number(limpio);
    if (numero > 100000) return total;
    return total + numero;
  }, 0);
}

export function CampanaFormModal({
  campana,
  onCerrar,
  onGuardada,
  onEliminada,
  pantallaCompleta = false,
}: CampanaFormModalProps) {
  const textos = textosAdmin.nuevaCampana;
  const formId = useId();
  const [formulario, setFormulario] = useState<CampanaFormulario>(() => formularioDe(campana));
  const [guardadas, setGuardadas] = useState<FotoGuardada[]>(() => fotosDe(campana));
  const [errores, setErrores] = useState<ErroresCampana>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);
  const [descartar, setDescartar] = useState(false);
  const edicion = campana !== null;
  const total = sumaContadores([
    formulario.perrosMachos,
    formulario.perrosHembras,
    formulario.gatosMachos,
    formulario.gatosHembras,
  ]);

  function actualizar(campo: keyof CampanaFormulario, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function hayCambios() {
    const base = formularioDe(campana);
    const campos = (Object.keys(base) as (keyof CampanaFormulario)[]).some(
      (campo) => formulario[campo] !== base[campo] && campo !== 'fotos',
    );
    const fotosNuevas = formulario.fotos.length > 0;
    const fotosQuitadas = guardadas.length !== fotosDe(campana).length;
    return campos || fotosNuevas || fotosQuitadas;
  }

  function cerrar() {
    if (guardando || borrando) return;
    if (pantallaCompleta && hayCambios()) {
      setDescartar(true);
      return;
    }
    onCerrar();
  }

  async function eliminar() {
    if (!campana || borrando) return;
    setBorrando(true);
    setErrorBorrado(null);
    try {
      await deleteCampana(campana.id);
      onEliminada();
    } catch (causa) {
      setErrorBorrado(
        causa instanceof ErrorApiAdmin && causa.status === 409
          ? textosAdmin.campanas.eliminar.noPermitida
          : textosAdmin.supuestos.error,
      );
      setBorrando(false);
    }
  }

  /** Quita del servidor las fotos que el usuario retiró. Una que ya no existe cuenta como quitada. */
  async function quitarFotosRetiradas(original: CampanaConTotales): Promise<boolean> {
    const conservadas = new Set(guardadas.map((foto) => foto.valor));
    let todoBien = true;
    for (const [indice, url] of original.fotos.entries()) {
      const fotoId = original.fotoIds[indice];
      if (conservadas.has(url) || !fotoId) continue;
      try {
        await quitarFotoCampana(original.id, fotoId);
      } catch (causa) {
        if (!(causa instanceof ErrorApiAdmin && causa.status === 404)) todoBien = false;
      }
    }
    return todoBien;
  }

  async function guardar() {
    if (guardando) return;
    const resultado = validarCampana(formulario);
    if (!resultado.ok) {
      setErrores(resultado.errores);
      setErrorGeneral(null);
      return;
    }

    setErrores({});
    setErrorGeneral(null);
    setGuardando(true);
    try {
      const guardada = await guardarCampana(
        formulario,
        campana?.id,
        guardadas.map((foto) => foto.valor),
      );
      if (campana && !(await quitarFotosRetiradas(campana))) {
        setErrorGeneral(textosAdmin.supuestos.fotoNoQuito);
        setGuardando(false);
        return;
      }
      let fotosFallidas: File[] | null = null;
      if (formulario.fotos.length > 0) {
        try {
          await subirFotosCampana(guardada.id, formulario.fotos);
        } catch {
          fotosFallidas = formulario.fotos;
        }
      }
      onGuardada(guardada.id, fotosFallidas);
    } catch {
      setErrorGeneral(textosAdmin.supuestos.error);
      setGuardando(false);
    }
  }

  const existentes: FotoExistente[] = guardadas.map((foto) => ({
    clave: foto.clave,
    src: fuenteVisible(foto.valor),
    nombre: textosAdmin.campanas.foto,
  }));
  const Marco = pantallaCompleta ? PantallaCampana : ModalAdmin;

  useEffect(() => {
    if (!pantallaCompleta) return;
    function alTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape') cerrar();
    }
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  });

  return (
    <>
    <Marco
      abierto
      titulo={edicion ? textos.editarTitulo : textos.titulo}
      subtitulo={textos.subtitulo}
      onCerrar={cerrar}
      pie={
        <>
          {edicion && !pantallaCompleta ? (
            <BotonPildora
              variante="ghost"
              className="mr-auto gap-2"
              disabled={guardando}
              onClick={() => setConfirmar(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {textosAdmin.campanas.eliminar.boton}
            </BotonPildora>
          ) : null}
          <BotonPildora variante="ghost" disabled={guardando} onClick={cerrar}>
            {textos.cancelar}
          </BotonPildora>
          <BotonPildora
            type="submit"
            form={formId}
            disabled={guardando}
            aria-busy={guardando}
            className={pantallaCompleta ? 'min-w-0 flex-1' : undefined}
          >
            {guardando ? textosAdmin.supuestos.guardando : edicion ? textos.guardarCambios : textos.guardar}
          </BotonPildora>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void guardar();
        }}
      >
        {errorGeneral ? (
          <p className="t-small text-naranja" role="alert">
            {errorGeneral}
          </p>
        ) : null}
        <CampoTexto
          id={`${formId}-titulo`}
          etiqueta={textos.tituloCampo}
          valor={formulario.titulo}
          placeholder={textos.tituloPlaceholder}
          error={errores.titulo}
          deshabilitado={guardando}
          onChange={(valor) => actualizar('titulo', valor)}
        />
        <div className={pantallaCompleta ? 'flex flex-col gap-5' : 'flex items-start gap-4'}>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-lugar`}
              etiqueta={textos.lugar}
              valor={formulario.lugar}
              placeholder={textos.lugarPlaceholder}
              error={errores.lugar}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('lugar', valor)}
            />
          </div>
          <div className={pantallaCompleta ? 'min-w-0' : 'w-fecha-campo shrink-0'}>
            <CampoTexto
              id={`${formId}-fecha`}
              etiqueta={formulario.publicada ? textos.fecha : textos.fechaOpcional}
              tipo="date"
              idioma="es"
              valor={formulario.fecha}
              placeholder={textos.fechaPlaceholder}
              icono={<Calendar className="size-4" aria-hidden="true" />}
              error={errores.fecha}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('fecha', valor)}
            />
          </div>
        </div>
        <CampoTexto
          id={`${formId}-descripcion`}
          etiqueta={textos.descripcion}
          valor={formulario.descripcion}
          placeholder={textos.descripcionPlaceholder}
          multilinea
          error={errores.descripcion}
          deshabilitado={guardando}
          onChange={(valor) => actualizar('descripcion', valor)}
        />
        <div className={pantallaCompleta ? 'flex items-start gap-3' : 'flex items-start gap-4'}>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-perros-machos`}
              etiqueta={textos.perrosMachos}
              tipo="number"
              valor={formulario.perrosMachos}
              placeholder={textos.contadorPlaceholder}
              error={errores.perrosMachos}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('perrosMachos', valor)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-perros-hembras`}
              etiqueta={textos.perrosHembras}
              tipo="number"
              valor={formulario.perrosHembras}
              placeholder={textos.contadorPlaceholder}
              error={errores.perrosHembras}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('perrosHembras', valor)}
            />
          </div>
        </div>
        <div className={pantallaCompleta ? 'flex items-start gap-3' : 'flex items-start gap-4'}>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-gatos-machos`}
              etiqueta={textos.gatosMachos}
              tipo="number"
              valor={formulario.gatosMachos}
              placeholder={textos.contadorPlaceholder}
              error={errores.gatosMachos}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('gatosMachos', valor)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-gatos-hembras`}
              etiqueta={textos.gatosHembras}
              tipo="number"
              valor={formulario.gatosHembras}
              placeholder={textos.contadorPlaceholder}
              error={errores.gatosHembras}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('gatosHembras', valor)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-btn bg-crema-tono px-5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <p className="t-nav text-negro">{textos.total}</p>
            <p className="t-small text-negro">{textos.totalNota}</p>
          </div>
          <p className="t-total-vivo text-negro" aria-live="polite">
            {formatNumber(total, 'es')}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-btn border border-linea px-5 py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="t-nav text-negro">{textos.ingles}</p>
            <p className="t-small text-negro">{textos.inglesNota}</p>
          </div>
          <ChevronDown className="size-5 shrink-0 text-negro" aria-hidden="true" />
        </div>
        {pantallaCompleta ? null : (
        <Interruptor
          id={`${formId}-publicada`}
          etiqueta={textos.publicada}
          nota={textos.publicadaNota}
          activo={formulario.publicada}
          onChange={(activo) => {
            if (guardando) return;
            setFormulario((actual) => ({ ...actual, publicada: activo }));
            if (!activo) setErrores((actual) => ({ ...actual, lugar: undefined, fecha: undefined }));
          }}
        />
        )}
        <div className="flex flex-col gap-2">
          <p className="t-chip text-negro">{textos.fotos}</p>
          <ZonaFotos
            id={`${formId}-fotos`}
            texto={textos.agregarFotos}
            multiple
            variante="mosaico"
            archivos={formulario.fotos}
            onArchivos={(fotos) => setFormulario((actual) => ({ ...actual, fotos }))}
            existentes={existentes}
            onQuitarExistente={(clave) =>
              setGuardadas((actuales) => actuales.filter((foto) => foto.clave !== clave))
            }
            nota={textos.notaFotos}
          />
          {errores.fotos ? (
            <p className="t-small text-naranja" role="alert">
              {errores.fotos}
            </p>
          ) : null}
        </div>
        {pantallaCompleta && edicion && campana ? (
          <div className="border-linea flex flex-col gap-3 border-t pt-5">
            <p className="t-chip text-negro">{textosAdmin.campanas.zonaPeligro}</p>
            <p className="t-small text-negro">
              {textosAdmin.campanas.zonaPeligroNota(formatNumber(campana.totales.total, 'es'))}
            </p>
            <BotonPildora
              variante="peligro"
              className="h-(--size-control-admin) w-full gap-2"
              disabled={guardando}
              onClick={() => setConfirmar(true)}
            >
              <Trash2 className="size-5" aria-hidden="true" />
              {textosAdmin.campanas.eliminar.boton}
            </BotonPildora>
          </div>
        ) : null}
      </form>
    </Marco>
    {descartar ? (
      createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <button
            type="button"
            className="bg-velo absolute inset-0"
            aria-label={textosAdmin.campanas.seguirEditando}
            onClick={() => setDescartar(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${formId}-descartar`}
            className="border-negro bg-blanco relative flex w-full max-w-sm flex-col gap-4 rounded-admin border p-6"
          >
            <h2 id={`${formId}-descartar`} className="t-pantalla-movil text-negro">
              {textosAdmin.campanas.descartarTitulo}
            </h2>
            <p className="t-control text-negro">{textosAdmin.campanas.descartarCuerpo}</p>
            <BotonPildora onClick={() => setDescartar(false)}>
              {textosAdmin.campanas.seguirEditando}
            </BotonPildora>
            <BotonPildora variante="ghost" onClick={onCerrar}>
              {textosAdmin.campanas.descartar}
            </BotonPildora>
          </div>
        </div>,
        document.body,
      )
    ) : null}
    {confirmar && campana && pantallaCompleta ? (
      <ConfirmacionEliminarMovil
        titulo={textosAdmin.campanas.eliminar.tituloMovil(campana.titulo)}
        cuerpo={textosAdmin.campanas.eliminar.cuerpoMovil(formatNumber(campana.totales.total, 'es'))}
        accion={textosAdmin.campanas.eliminar.accionMovil}
        cancelar={textos.cancelar}
        borrando={borrando}
        error={errorBorrado}
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => void eliminar()}
      />
    ) : null}
    {confirmar && campana && !pantallaCompleta ? (
      <ConfirmarEliminarModal
        titulo={textosAdmin.campanas.eliminar.titulo}
        detalle={textosAdmin.campanas.eliminar.cuerpo(campana.titulo)}
        accion={textosAdmin.campanas.eliminar.accion}
        peligro
        borrando={borrando}
        error={errorBorrado}
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => void eliminar()}
      />
    ) : null}
    </>
  );
}
