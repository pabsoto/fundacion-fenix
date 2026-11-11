import { ChevronLeft, ChevronRight } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';

type PaginacionProps = {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  deshabilitado?: boolean;
};

/** Anterior / siguiente de las tablas del panel. No se dibuja con una sola página. */
export function Paginacion({
  pagina,
  totalPaginas,
  onCambiar,
  deshabilitado = false,
}: PaginacionProps) {
  const textos = textosAdmin.paginacion;
  if (totalPaginas <= 1) return null;

  return (
    <nav aria-label={textos.etiqueta} className="flex shrink-0 items-center gap-3">
      <BotonPildora
        variante="ghost"
        className="gap-1.5"
        disabled={deshabilitado || pagina <= 1}
        onClick={() => onCambiar(pagina - 1)}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {textos.anterior}
      </BotonPildora>
      <p className="t-small text-negro" aria-live="polite">
        {textos.pagina(pagina, totalPaginas)}
      </p>
      <BotonPildora
        variante="ghost"
        className="gap-1.5"
        disabled={deshabilitado || pagina >= totalPaginas}
        onClick={() => onCambiar(pagina + 1)}
      >
        {textos.siguiente}
        <ChevronRight className="size-4" aria-hidden="true" />
      </BotonPildora>
    </nav>
  );
}
