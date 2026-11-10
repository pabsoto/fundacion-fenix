import { cn } from '@/lib/cn';

type InterruptorProps = {
  id: string;
  etiqueta: string;
  nota?: string;
  activo: boolean;
  onChange: (activo: boolean) => void;
};

export function Interruptor({ id, etiqueta, nota, activo, onChange }: InterruptorProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={activo}
      onClick={() => onChange(!activo)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-btn bg-crema-tono px-5 py-3.5 text-left"
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="t-nav text-negro">{etiqueta}</span>
        {nota ? <span className="t-small text-negro">{nota}</span> : null}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative h-(--size-switch-alto) w-(--size-switch-ancho) shrink-0 rounded-pill transition-colors',
          activo ? 'bg-amarillo' : 'bg-linea',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 size-(--size-switch-perilla) -translate-y-1/2 rounded-full bg-blanco shadow-soft',
            activo ? 'right-switch-inset' : 'left-switch-inset',
          )}
        />
      </span>
    </button>
  );
}
