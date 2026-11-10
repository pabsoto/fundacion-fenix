import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { validarImagen } from '@/schemas/imagen';

type Vista = { nombre: string; url: string };

export type FotoExistente = {
  clave: string;
  src: string | null;
  nombre: string;
};

type ZonaFotosProps = {
  id: string;
  texto: string;
  multiple?: boolean;
  archivos: File[];
  onArchivos: (archivos: File[]) => void;
  variante?: 'apilada' | 'mosaico';
  existentes?: FotoExistente[];
  onQuitarExistente?: (clave: string) => void;
  nota?: string;
};

function vistasDe(archivos: File[]): Vista[] {
  return archivos.map((archivo) => ({
    nombre: archivo.name,
    url: URL.createObjectURL(archivo),
  }));
}

function BotonQuitar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={textosAdmin.nuevaCampana.quitarFoto}
      onClick={onClick}
      className="absolute top-1.5 right-1.5 flex size-quitar-foto cursor-pointer items-center justify-center rounded-full border border-linea bg-blanco text-negro"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

export function ZonaFotos({
  id,
  texto,
  multiple = false,
  archivos,
  onArchivos,
  variante = 'apilada',
  existentes = [],
  onQuitarExistente,
  nota,
}: ZonaFotosProps) {
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [vistos, setVistos] = useState<Vista[]>([]);
  const vistosRef = useRef(vistos);

  useEffect(() => {
    vistosRef.current = vistos;
  }, [vistos]);

  useEffect(() => {
    return () => {
      vistosRef.current.forEach((visto) => URL.revokeObjectURL(visto.url));
    };
  }, []);

  function publicar(siguientes: File[]) {
    vistos.forEach((visto) => URL.revokeObjectURL(visto.url));
    setVistos(vistasDe(siguientes));
    onArchivos(siguientes);
  }

  function recibir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const elegidos = [...lista];
    for (const archivo of elegidos) {
      const mensaje = validarImagen(archivo);
      if (mensaje) {
        setError(mensaje);
        return;
      }
    }
    setError(null);
    publicar(multiple ? [...archivos, ...elegidos] : elegidos.slice(0, 1));
  }

  function quitar(indice: number) {
    publicar(archivos.filter((_, posicion) => posicion !== indice));
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          recibir(event.target.files);
          event.target.value = '';
        }}
      />
      {variante === 'mosaico' ? (
        <div className="flex flex-wrap items-start gap-3">
          <label
            htmlFor={id}
            className="flex h-mosaico-foto w-agregar-foto cursor-pointer items-center justify-center rounded-admin-control border border-dashed border-linea bg-crema-tono px-4 t-control text-negro"
          >
            {texto}
          </label>
          {existentes.map((foto) => (
            <span
              key={foto.clave}
              className="relative size-mosaico-foto overflow-hidden rounded-admin-control bg-crema-tono"
            >
              {foto.src ? (
                <img src={foto.src} alt={foto.nombre} className="size-full object-cover" />
              ) : null}
              {onQuitarExistente ? (
                <BotonQuitar onClick={() => onQuitarExistente(foto.clave)} />
              ) : null}
            </span>
          ))}
          {vistos.map((visto, indice) => (
            <span
              key={visto.url}
              className="relative size-mosaico-foto overflow-hidden rounded-admin-control bg-crema-tono"
            >
              <img src={visto.url} alt={visto.nombre} className="size-full object-cover" />
              <BotonQuitar onClick={() => quitar(indice)} />
            </span>
          ))}
        </div>
      ) : vistos.length === 0 && existentes.length === 0 ? (
        <label
          htmlFor={id}
          className="flex h-zona-foto cursor-pointer items-center justify-center rounded-admin-control border border-dashed border-linea bg-crema-tono px-4 t-control text-negro"
        >
          {texto}
        </label>
      ) : (
        <div className="flex min-h-zona-foto flex-wrap items-center gap-2 rounded-admin-control border border-dashed border-linea bg-crema-tono p-2">
          {existentes.map((foto) => (
            <span
              key={foto.clave}
              className="relative h-14 w-14 overflow-hidden rounded-btn bg-blanco"
            >
              {foto.src ? (
                <img src={foto.src} alt={foto.nombre} className="size-full object-cover" />
              ) : null}
              {onQuitarExistente ? (
                <BotonQuitar onClick={() => onQuitarExistente(foto.clave)} />
              ) : null}
            </span>
          ))}
          {vistos.map((visto, indice) => (
            <span key={visto.url} className="relative h-14 w-14 overflow-hidden rounded-btn">
              <img src={visto.url} alt={visto.nombre} className="size-full object-cover" />
              <button
                type="button"
                aria-label={textosAdmin.nuevaCampana.quitarFoto}
                onClick={() => quitar(indice)}
                className="absolute top-0.5 right-0.5 flex size-5 cursor-pointer items-center justify-center rounded-full bg-blanco text-negro"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <label htmlFor={id} className="cursor-pointer px-2 t-small text-negro">
            {texto}
          </label>
        </div>
      )}
      {nota ? <p className="t-small text-negro">{nota}</p> : null}
      {error ? (
        <p id={errorId} className="t-small text-naranja">
          {error}
        </p>
      ) : null}
    </div>
  );
}
