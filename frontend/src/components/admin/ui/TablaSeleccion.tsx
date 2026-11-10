import { cn } from '@/lib/cn';
import { textosAdmin } from '@/content/textos-admin';

export type ColumnaTabla<T> = {
  id: string;
  encabezado: string;
  className?: string;
  celda: (fila: T) => React.ReactNode;
};

type TablaSeleccionProps<T extends { id: string }> = {
  etiqueta: string;
  columnas: ColumnaTabla<T>[];
  filas: T[];
  seleccionId: string | null;
  onSeleccionar: (id: string) => void;
};

export function TablaSeleccion<T extends { id: string }>({
  etiqueta,
  columnas,
  filas,
  seleccionId,
  onSeleccionar,
}: TablaSeleccionProps<T>) {
  function mover(indice: number, delta: number) {
    const destino = filas[indice + delta];
    if (!destino) return;
    onSeleccionar(destino.id);
  }

  return (
    <div role="table" aria-label={etiqueta} className="w-full">
      <div role="row" className="flex h-encabezado-tabla items-center border-b border-linea px-3">
        {columnas.map((columna) => (
          <div
            key={columna.id}
            role="columnheader"
            className={cn('t-small shrink-0 text-negro', columna.className)}
          >
            {columna.encabezado}
          </div>
        ))}
      </div>
      {filas.length === 0 ? (
        <p className="px-3 py-4 t-small text-negro">{textosAdmin.supuestos.vacio}</p>
      ) : (
        filas.map((fila, indice) => {
          const seleccionada = fila.id === seleccionId;
          return (
            <div
              key={fila.id}
              role="row"
              tabIndex={0}
              aria-selected={seleccionada}
              onClick={() => onSeleccionar(fila.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  mover(indice, 1);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  mover(indice, -1);
                } else if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSeleccionar(fila.id);
                }
              }}
              className={cn(
                'flex h-fila-admin cursor-pointer items-center px-3',
                seleccionada ? 'rounded-btn bg-crema-tono' : 'border-b border-linea last:border-b-0',
              )}
            >
              {columnas.map((columna) => (
                <div key={columna.id} role="cell" className={cn('shrink-0', columna.className)}>
                  {columna.celda(fila)}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
