import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type OpcionFiltro = {
  valor: string;
  etiqueta: string;
  /** Se ve en gris y sigue pudiendo elegirse. */
  atenuada?: boolean;
};

type ItemFiltro = {
  valor: string | null;
  etiqueta: string;
  atenuada?: boolean;
};

type SelectFiltroProps = {
  id: string;
  etiqueta: string;
  valor: string | null;
  textoValor: string | null;
  todosEtiqueta: string;
  opciones: OpcionFiltro[];
  disposicion: 'lista' | 'cuadricula';
  onCambio: (valor: string | null) => void;
};

function mover(indice: number, tecla: string, total: number, columnas: number | null): number {
  const ultimo = total - 1;
  if (tecla === 'Home') return 0;
  if (tecla === 'End') return ultimo;
  if (columnas === null) {
    if (tecla === 'ArrowUp' || tecla === 'ArrowLeft') return Math.max(0, indice - 1);
    if (tecla === 'ArrowDown' || tecla === 'ArrowRight') return Math.min(ultimo, indice + 1);
    return indice;
  }
  if (tecla === 'ArrowLeft') return Math.max(0, indice - 1);
  if (tecla === 'ArrowRight') return Math.min(ultimo, indice + 1);
  if (tecla === 'ArrowUp') {
    if (indice <= columnas) return 0;
    return indice - columnas;
  }
  if (tecla === 'ArrowDown') {
    if (indice === 0) return Math.min(1, ultimo);
    const destino = indice + columnas;
    return destino <= ultimo ? destino : indice;
  }
  return indice;
}

export function SelectFiltro({
  id,
  etiqueta,
  valor,
  textoValor,
  todosEtiqueta,
  opciones,
  disposicion,
  onCambio,
}: SelectFiltroProps) {
  const reactId = useId();
  const raiz = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const [cierre, setCierre] = useState<'foco' | 'silencio' | null>(null);
  const listaId = `${id}-lista`;
  const items: ItemFiltro[] = [
    { valor: null, etiqueta: todosEtiqueta },
    ...opciones.map((opcion) => ({
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
      atenuada: opcion.atenuada,
    })),
  ];
  const seleccionado = Math.max(
    0,
    items.findIndex((item) => item.valor === valor),
  );
  const conValor = valor !== null && textoValor !== null;
  const textoChip = conValor ? `${etiqueta}: ${textoValor}` : etiqueta;
  const columnas = disposicion === 'cuadricula' ? 3 : null;

  function abrir() {
    setActivo(seleccionado);
    setAbierto(true);
  }

  function cerrar(devolverFoco: boolean) {
    setCierre(devolverFoco ? 'foco' : 'silencio');
    setAbierto(false);
  }

  function elegir(indice: number) {
    const item = items[indice];
    if (!item) return;
    onCambio(item.valor);
    cerrar(true);
  }

  useEffect(() => {
    if (abierto || cierre !== 'foco') return;
    document.getElementById(id)?.focus();
  }, [abierto, cierre, id]);

  useEffect(() => {
    if (!abierto) return;
    function cerrarSiAfuera(event: MouseEvent) {
      if (raiz.current?.contains(event.target as Node)) return;
      const control =
        event.target instanceof HTMLElement &&
        event.target.closest('button, a, input, select, textarea');
      setCierre(control ? 'silencio' : 'foco');
      setAbierto(false);
    }
    document.addEventListener('mousedown', cerrarSiAfuera);
    return () => document.removeEventListener('mousedown', cerrarSiAfuera);
  }, [abierto]);

  function alTeclado(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!abierto) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        abrir();
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cerrar(true);
      return;
    }
    if (event.key === 'Tab') {
      setAbierto(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      elegir(activo);
      return;
    }
    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      setActivo((indice) => mover(indice, event.key, items.length, columnas));
    }
  }

  function opcion(item: ItemFiltro, indice: number) {
    const elegida = item.valor === valor;
    const resaltada = abierto && indice === activo && !elegida;
    return (
      <div
        key={`${item.valor ?? 'todos'}-${indice}`}
        id={`${reactId}-opcion-${indice}`}
        role="option"
        aria-selected={elegida}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActivo(indice)}
        onClick={() => elegir(indice)}
        className={cn(
          'flex h-(--size-opcion-admin) cursor-pointer items-center rounded-opcion-admin px-3 t-chip',
          disposicion === 'lista' || indice === 0 ? 'justify-between' : 'justify-center px-1',
          elegida ? 'bg-negro text-blanco' : 'text-negro',
          resaltada && 'bg-crema-tono',
          item.atenuada && !elegida && 'text-placeholder',
        )}
      >
        <span>{item.etiqueta}</span>
        {elegida && (disposicion === 'lista' || indice === 0) ? (
          <Check className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
      </div>
    );
  }

  const resto = items.slice(1);

  return (
    <div ref={raiz} className="relative">
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-activedescendant={abierto ? `${reactId}-opcion-${activo}` : undefined}
        onClick={() => (abierto ? cerrar(false) : abrir())}
        onKeyDown={alTeclado}
        className={cn(
          'inline-flex cursor-pointer items-center gap-1.5 rounded-pill px-chip-admin py-chip-admin-y t-chip',
          conValor ? 'bg-negro text-crema' : 'border border-linea bg-transparent text-negro',
        )}
      >
        {textoChip}
        <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
      {abierto ? (
        <div
          id={listaId}
          role="listbox"
          aria-label={etiqueta}
          className={cn(
            'absolute top-full left-0 z-20 mt-2 flex flex-col rounded-card border border-linea bg-blanco p-2 shadow-desplegable-admin',
            disposicion === 'cuadricula' ? 'w-(--size-menu-mes) gap-1' : 'w-(--size-menu-anio) gap-0.5',
          )}
        >
          {disposicion === 'lista'
            ? items.map((item, indice) => opcion(item, indice))
            : (
              <>
                {items[0] ? opcion(items[0], 0) : null}
                <div className="grid grid-cols-3 gap-1">
                  {resto.map((item, indice) => opcion(item, indice + 1))}
                </div>
              </>
            )}
        </div>
      ) : null}
    </div>
  );
}
