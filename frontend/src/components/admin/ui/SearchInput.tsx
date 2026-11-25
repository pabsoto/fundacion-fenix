import { useRef, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { cn } from '@/lib/cn';

type SearchInputProps = {
  value: string;
  onChange: (valor: string) => void;
  onClear: () => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
};

function IconoLupa() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="buscador-admin-lupa shrink-0 text-negro"
    >
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16.5L20 20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Buscador de interfaz. El filtrado lo conecta quien pasa onChange. */
export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
  className,
}: SearchInputProps) {
  const campo = useRef<HTMLInputElement>(null);

  function limpiar() {
    onClear();
    campo.current?.focus();
  }

  function alTecla(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Escape' || value.length === 0) return;
    event.preventDefault();
    limpiar();
  }

  return (
    <div
      className={cn(
        'buscador-admin-campo flex h-(--size-toque-admin) min-w-0 items-center gap-2 rounded-card border border-linea bg-blanco pl-3',
        value ? 'pr-0' : 'pr-3',
        className,
      )}
    >
      <IconoLupa />
      <input
        ref={campo}
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        enterKeyHint="search"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={alTecla}
        className="buscador-admin t-body min-w-0 flex-1 bg-transparent text-negro placeholder:text-placeholder"
      />
      {value ? (
        <button
          type="button"
          aria-label={textosAdmin.campanas.borrarBusqueda}
          onMouseDown={(event) => event.preventDefault()}
          onClick={limpiar}
          className="flex size-(--size-toque-admin) shrink-0 items-center justify-center text-texto-secundario"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
