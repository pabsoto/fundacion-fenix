import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { EXPORT_PDF_ENABLED } from '@/config/exportacion-admin';
import { textosAdmin } from '@/content/textos-admin';
import { nombreDeDescarga } from '@/lib/nombre-descarga';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { ErrorApiAdmin } from '@/services/admin/cliente-admin';

type PanelExportacionProps = {
  abierto: boolean;
  titulo: string;
  resumen: string;
  nombre: string;
  onNombre: (valor: string) => void;
  nombreSugerido: string;
  onCerrar: () => void;
  onDescargarCsv: (nombreArchivo: string) => Promise<void>;
};

const SELECCION =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Un solo panel: hoja inferior por debajo de 48rem y modal centrado desde ahí.
 * El estado (abierto, nombre) vive en la pestaña para que un cambio de ancho no lo cierre.
 */
export function PanelExportacion({
  abierto,
  titulo,
  resumen,
  nombre,
  onNombre,
  nombreSugerido,
  onCerrar,
  onDescargarCsv,
}: PanelExportacionProps) {
  const textos = textosAdmin.exportar;
  const tituloId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const cerrarRef = useRef(onCerrar);
  const generandoRef = useRef(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function marcarGenerando(valor: boolean) {
    generandoRef.current = valor;
    setGenerando(valor);
  }

  useEffect(() => {
    cerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const campo = nombreRef.current;
    campo?.focus();
    campo?.select();

    function enfocable() {
      const nodo = dialogRef.current;
      if (!nodo) return [];
      return [...nodo.querySelectorAll<HTMLElement>(SELECCION)];
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!generandoRef.current) cerrarRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const lista = enfocable();
      if (lista.length === 0) return;
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

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previo?.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  async function descargar() {
    if (generando) return;
    marcarGenerando(true);
    setError(null);
    try {
      await onDescargarCsv(nombreDeDescarga(nombre, nombreSugerido, 'csv'));
      cerrarRef.current();
    } catch (causa) {
      setError(causa instanceof ErrorApiAdmin ? causa.message : textos.error);
      marcarGenerando(false);
    }
  }

  return createPortal(
    <div
      className="bg-velo fixed inset-0 z-50 flex items-end justify-center tablet:items-center tablet:px-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !generandoRef.current) cerrarRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="bg-blanco border-linea flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-t-admin border pb-(--spacing-safe-exportar) shadow-modal-admin tablet:w-(--size-modal-exportar) tablet:rounded-admin tablet:pb-0"
      >
        <div className="bg-linea mx-auto mt-3 h-1 w-10 shrink-0 rounded-pill tablet:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 px-6 pt-4 pb-3">
          <h2 id={tituloId} className="t-modal-titulo text-negro">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={() => cerrarRef.current()}
            disabled={generando}
            aria-label={textos.cerrar}
            className="border-linea flex size-(--size-toque-admin) shrink-0 cursor-pointer items-center justify-center rounded-full border text-negro disabled:opacity-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6">
          <p className="t-small text-texto-secundario">{resumen}</p>
          <label className="flex flex-col gap-2">
            <span className="t-small text-negro">{textos.guardarComo}</span>
            <input
              ref={nombreRef}
              value={nombre}
              onChange={(event) => onNombre(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
              className="border-linea t-control text-negro h-(--size-control-admin) rounded-admin-control border bg-blanco px-4 outline-none"
            />
            <span className="t-small text-texto-secundario">{textos.ayudaNombre}</span>
          </label>
          {error ? (
            <div className="flex flex-wrap items-center gap-3" role="alert">
              <p className="t-small text-negro">{error}</p>
              <BotonPildora variante="ghost" disabled={generando} onClick={() => void descargar()}>
                {textosAdmin.supuestos.reintentar}
              </BotonPildora>
            </div>
          ) : null}
          <div className="flex gap-3">
            <BotonPildora
              variante="ghost"
              className="min-h-(--size-control-admin) flex-1"
              disabled={!EXPORT_PDF_ENABLED || generando}
              title={EXPORT_PDF_ENABLED ? undefined : textos.proximamente}
              aria-label={EXPORT_PDF_ENABLED ? textos.pdf : `${textos.pdf}. ${textos.proximamente}`}
            >
              {EXPORT_PDF_ENABLED ? textos.pdf : `${textos.pdf} · ${textos.proximamente}`}
            </BotonPildora>
            <BotonPildora
              variante="ghost"
              className="min-h-(--size-control-admin) flex-1"
              disabled={generando}
              aria-busy={generando}
              onClick={() => void descargar()}
            >
              {generando ? textos.generando : textos.csv}
            </BotonPildora>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
