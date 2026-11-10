import { cn } from '@/lib/cn';

type CampoTextoProps = {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'number';
  icono?: React.ReactNode;
  acompanante?: React.ReactNode;
  error?: string;
  deshabilitado?: boolean;
};

export function CampoTexto({
  id,
  etiqueta,
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  icono,
  acompanante,
  error,
  deshabilitado = false,
}: CampoTextoProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="t-chip text-negro">
        {etiqueta}
      </label>
      <div className={cn('flex items-center gap-2', acompanante && 'min-w-0')}>
        <div className="relative min-w-0 flex-1">
        <input
          id={id}
          type={tipo}
          value={valor}
          placeholder={placeholder}
          disabled={deshabilitado}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'h-(--size-control-admin) w-full rounded-admin-control border border-linea bg-blanco px-4 t-control text-negro placeholder:text-placeholder',
            icono && 'pr-10',
            tipo === 'number' &&
              '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
        />
        {icono ? (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-negro">
            {icono}
          </span>
        ) : null}
        </div>
        {acompanante}
      </div>
      {error ? (
        <p id={errorId} className="t-small text-naranja">
          {error}
        </p>
      ) : null}
    </div>
  );
}
