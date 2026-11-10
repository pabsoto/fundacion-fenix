import { cn } from '@/lib/cn';

type MarcaEstadoProps = {
  adoptado: boolean;
  children: React.ReactNode;
};

/** Punto amarillo si está adoptado; círculo hueco si sigue en la fundación. */
export function MarcaEstado({ adoptado, children }: MarcaEstadoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          adoptado ? 'bg-amarillo' : 'border border-negro/40',
        )}
      />
      <span className="t-control text-negro">{children}</span>
    </span>
  );
}
