import { cn } from '@/lib/cn';

type MarcaEstadoProps = {
  activo: boolean;
  children: React.ReactNode;
};

/** Punto amarillo si el estado está activo (adoptado, publicada); círculo hueco si no. */
export function MarcaEstado({ activo, children }: MarcaEstadoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 shrink-0 rounded-full',
          activo ? 'bg-amarillo' : 'border border-negro/40',
        )}
      />
      <span className="t-control text-negro">{children}</span>
    </span>
  );
}
