import { useState } from 'react';
import { cn } from '@/lib/cn';

export type FotoDetalle = {
  src: string | null;
  etiqueta: string;
};

export type FilaDetalle = {
  id: string;
  icono: React.ReactNode;
  etiqueta: string;
  valor: React.ReactNode;
  divisor?: boolean;
  alto?: 'fijo' | 'auto';
  valorClassName?: string;
};

type PanelDetalleProps = {
  fotos: FotoDetalle[];
  titulo: string;
  subtitulo: string;
  accion?: React.ReactNode;
  antes?: React.ReactNode;
  filas: FilaDetalle[];
  className?: string;
};

function Foto({ src, etiqueta }: FotoDetalle) {
  const [rota, setRota] = useState(false);
  const visible = Boolean(src) && !rota;

  return (
    <div className="relative h-foto-detalle min-w-0 flex-1 overflow-hidden rounded-btn bg-crema-tono">
      {visible ? (
        <img
          src={src ?? undefined}
          alt={etiqueta}
          className="absolute inset-0 size-full object-cover"
          onError={() => setRota(true)}
        />
      ) : null}
      <span className="absolute bottom-2 left-2 rounded-pill bg-blanco px-2.5 py-1 t-foto text-negro">
        {etiqueta}
      </span>
    </div>
  );
}

export function PanelDetalle({
  fotos,
  titulo,
  subtitulo,
  accion,
  antes,
  filas,
  className,
}: PanelDetalleProps) {
  return (
    <aside className={cn('flex w-panel-detalle shrink-0 flex-col items-center gap-5 border-l border-linea p-7', className)}>
      {antes}
      {fotos.length > 0 ? (
        <div className="flex w-full gap-2">
          {fotos.map((foto) => (
            <Foto key={foto.etiqueta} src={foto.src} etiqueta={foto.etiqueta} />
          ))}
        </div>
      ) : null}
      <div className="flex w-full flex-col items-center gap-1 text-center">
        <h2 className="t-detalle w-full text-negro">{titulo}</h2>
        <p className="t-small text-negro">{subtitulo}</p>
      </div>
      {accion}
      <dl className="w-full">
        {filas.map((fila) => (
          <div
            key={fila.id}
            className={cn(
              'flex items-center justify-between gap-3',
              fila.alto === 'auto' ? 'py-3' : 'h-dato-admin',
              fila.divisor === false ? '' : 'border-b border-linea',
            )}
          >
            <dt className="flex items-center gap-2.5 text-negro">
              <span className="text-negro" aria-hidden="true">
                {fila.icono}
              </span>
              <span className="t-control">{fila.etiqueta}</span>
            </dt>
            <dd className={cn('text-right text-negro', fila.valorClassName ?? 't-nav')}>{fila.valor}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
