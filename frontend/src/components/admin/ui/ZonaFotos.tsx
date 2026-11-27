import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { validarImagen } from '@/schemas/imagen';
import { Photo } from '@/components/ui/Photo';

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
  variante?: 'apilada' | 'mosaico' | 'qr';
  existentes?: FotoExistente[];
  onQuitarExistente?: (clave: string) => void;
  nota?: string;
  /** Si se indica, sustituye el tope de 5 MB. El mensaje lo pasa quien llama. */
  maximoBytes?: number;
  mensajeInvalido?: string;
  /** Área táctil de quitar y de cambiar imagen, solo en Donaciones móvil. */
  toque?: boolean;
};

function mismosArchivos(a: readonly File[], b: readonly File[]): boolean {
  return a.length === b.length && a.every((archivo, indice) => archivo === b[indice]);
}

function vistasDe(archivos: File[]): Vista[] {
  return archivos.map((archivo) => ({
    nombre: archivo.name,
    url: URL.createObjectURL(archivo),
  }));
}

function FilaQr({
  id,
  texto,
  nota,
  vista,
  existente,
  onQuitarVista,
  onQuitarExistente,
  toque = false,
}: {
  id: string;
  texto: string;
  nota?: string;
  vista?: Vista;
  existente?: FotoExistente;
  onQuitarVista: () => void;
  onQuitarExistente?: (clave: string) => void;
  toque?: boolean;
}) {
  const src = vista?.url ?? existente?.src ?? null;
  const nombre = vista?.nombre ?? existente?.nombre ?? '';
  const quitar = vista
    ? onQuitarVista
    : existente && onQuitarExistente
      ? () => onQuitarExistente(existente.clave)
      : null;

  return (
    <div className="flex items-center gap-4">
      <span className="relative size-qr-formulario shrink-0 overflow-hidden rounded-admin-control bg-crema-tono/60">
        {src ? (
          <Photo key={src} src={src} alt={nombre} radius="btn" className="size-full" />
        ) : null}
        {quitar ? <BotonQuitar onClick={quitar} /> : null}
      </span>
      <span className={toque ? 'flex min-w-0 flex-1 flex-col gap-1.5' : 'flex min-w-0 flex-col gap-1.5'}>
        <label
          htmlFor={id}
          className={
            toque
              ? 't-nav inline-flex min-h-(--size-toque-admin) w-fit cursor-pointer items-center text-negro underline'
              : 't-nav w-fit cursor-pointer text-negro underline'
          }
        >
          {texto}
        </label>
        {nota ? <p className="t-small text-texto-secundario">{nota}</p> : null}
      </span>
    </div>
  );
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
  maximoBytes,
  mensajeInvalido,
  toque = false,
}: ZonaFotosProps) {
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const [vistos, setVistos] = useState<Vista[]>([]);
  const vistosRef = useRef(vistos);
  const archivosRef = useRef(archivos);

  useEffect(() => {
    vistosRef.current = vistos;
  }, [vistos]);

  useEffect(() => {
    return () => {
      vistosRef.current.forEach((visto) => URL.revokeObjectURL(visto.url));
    };
  }, []);

  useEffect(() => {
    if (mismosArchivos(archivosRef.current, archivos)) {
      archivosRef.current = archivos;
      return;
    }
    archivosRef.current = archivos;
    setVistos((previos) => {
      previos.forEach((visto) => URL.revokeObjectURL(visto.url));
      return vistasDe(archivos);
    });
  }, [archivos]);

  function publicar(siguientes: File[]) {
    archivosRef.current = siguientes;
    vistos.forEach((visto) => URL.revokeObjectURL(visto.url));
    setVistos(vistasDe(siguientes));
    onArchivos(siguientes);
  }

  function recibir(lista: FileList | null) {
    if (!lista || lista.length === 0) return;
    const elegidos = [...lista];
    const limite =
      maximoBytes !== undefined && mensajeInvalido
        ? { maximoBytes, mensaje: mensajeInvalido }
        : undefined;
    for (const archivo of elegidos) {
      const mensaje = validarImagen(archivo, limite);
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
      {variante === 'qr' ? (
        <FilaQr
          id={id}
          texto={texto}
          nota={nota}
          vista={archivos.length > 0 ? vistos[0] : undefined}
          existente={existentes[0]}
          onQuitarVista={() => quitar(0)}
          onQuitarExistente={onQuitarExistente}
          toque={toque}
        />
      ) : variante === 'mosaico' ? (
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
      {nota && variante !== 'qr' ? <p className="t-small text-negro">{nota}</p> : null}
      {error ? (
        <p id={errorId} className="t-small text-naranja">
          {error}
        </p>
      ) : null}
    </div>
  );
}
