import { cn } from '@/lib/cn';

type CampoTextoProps = {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  tipo?: 'text' | 'number' | 'date';
  multilinea?: boolean;
  icono?: React.ReactNode;
  acompanante?: React.ReactNode;
  error?: string;
  deshabilitado?: boolean;
  idioma?: string;
  /** Solo el teléfono de donaciones. No cambia la validación. */
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** 16 px y margen de scroll para que el teclado no tape el campo. */
  toque?: boolean;
};

export function CampoTexto({
  id,
  etiqueta,
  valor,
  onChange,
  placeholder,
  tipo = 'text',
  multilinea = false,
  icono,
  acompanante,
  error,
  deshabilitado = false,
  idioma,
  inputMode,
  toque = false,
}: CampoTextoProps) {
  const errorId = error ? `${id}-error` : undefined;
  const claseToque = toque
    ? 'max-w-full text-base! scroll-mb-[calc(var(--spacing-contenido-bajo-barra)+env(safe-area-inset-bottom,0px))]'
    : null;
  const claseCampo = cn(
    'w-full rounded-admin-control border border-linea bg-blanco px-4 t-control text-negro placeholder:text-placeholder',
    multilinea ? 'h-area-admin resize-none pt-3.5' : 'h-(--size-control-admin)',
    icono && 'pr-10',
    tipo === 'number' &&
      '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    tipo === 'date' &&
      'relative [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
    tipo === 'date' && !valor && 'text-transparent',
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="t-chip text-negro">
        {etiqueta}
      </label>
      <div className={cn('flex items-center gap-2', acompanante && 'min-w-0')}>
        <div className="relative min-w-0 flex-1">
        {multilinea ? (
          <textarea
            id={id}
            value={valor}
            placeholder={placeholder}
            disabled={deshabilitado}
            lang={idioma}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            onChange={(event) => onChange(event.target.value)}
            className={claseToque ? cn(claseCampo, claseToque) : claseCampo}
          />
        ) : (
        <input
          id={id}
          type={tipo}
          inputMode={inputMode}
          value={valor}
          placeholder={placeholder}
          disabled={deshabilitado}
          lang={idioma}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.value)}
          className={claseToque ? cn(claseCampo, claseToque) : claseCampo}
        />
        )}
        {tipo === 'date' && !valor && placeholder ? (
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 t-control text-placeholder">
            {placeholder}
          </span>
        ) : null}
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
