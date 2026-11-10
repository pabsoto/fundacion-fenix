import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';

type ModalAdminProps = {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  children: React.ReactNode;
  pie?: React.ReactNode;
};

const SELECCION =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Solo el modal de encima cierra con Esc y atrapa el tabulador. */
let modalesAbiertos = 0;

export function ModalAdmin({
  abierto,
  titulo,
  subtitulo,
  onCerrar,
  children,
  pie,
}: ModalAdminProps) {
  const tituloId = useId();
  const subtituloId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef(onCerrar);

  useEffect(() => {
    cerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalesAbiertos += 1;
    const orden = modalesAbiertos;
    dialogRef.current?.focus();

    function enfocable() {
      const nodo = dialogRef.current;
      if (!nodo) return [];
      return [...nodo.querySelectorAll<HTMLElement>(SELECCION)].filter(
        (elemento) => elemento.tabIndex !== -1,
      );
    }

    function onKey(event: KeyboardEvent) {
      if (orden !== modalesAbiertos) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        cerrarRef.current();
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
      modalesAbiertos -= 1;
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previo?.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-velo px-6 pt-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrarRef.current();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={subtitulo ? subtituloId : undefined}
        tabIndex={-1}
        className="flex max-h-[calc(100dvh-4rem)] w-(--size-modal-admin) max-w-full flex-col overflow-hidden rounded-admin border border-linea bg-blanco shadow-modal-admin outline-none"
      >
        <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-5">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={tituloId} className="t-modal-titulo text-negro">
              {titulo}
            </h2>
            {subtitulo ? (
              <p id={subtituloId} className="t-control text-negro">
                {subtitulo}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => cerrarRef.current()}
            aria-label={textosAdmin.registrarAnimal.cerrar}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-linea text-negro"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="h-px bg-linea" />
        <div className="overflow-y-auto px-7 py-6">{children}</div>
        {pie ? (
          <>
            <div className="h-px bg-linea" />
            <div className="flex items-center justify-end gap-3 px-7 py-5">{pie}</div>
          </>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
