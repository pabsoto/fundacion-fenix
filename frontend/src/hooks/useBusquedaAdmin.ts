import { useEffect, useRef, useState } from 'react';
import { Q_MAXIMO } from '@/lib/filtros-url-admin';

const ESPERA_MS = 300;

/**
 * El input guarda el texto mientras se escribe. `qUrl` es el valor ya
 * publicado en la URL: al cargar o al volver atrás, el campo lo muestra.
 */
export function useBusquedaAdmin(qUrl: string, alConfirmar: (q: string) => void) {
  const [texto, setTexto] = useState(qUrl);
  const aplicada = useRef(qUrl);
  const urlAnterior = useRef(qUrl);
  const confirmar = useRef(alConfirmar);

  useEffect(() => {
    confirmar.current = alConfirmar;
  });

  useEffect(() => {
    if (urlAnterior.current === qUrl) return;
    urlAnterior.current = qUrl;
    aplicada.current = qUrl;
    setTexto(qUrl);
  }, [qUrl]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const siguiente = texto.trim().slice(0, Q_MAXIMO);
      if (aplicada.current === siguiente) return;
      aplicada.current = siguiente;
      confirmar.current(siguiente);
    }, ESPERA_MS);
    return () => window.clearTimeout(id);
  }, [texto]);

  function adoptar(valor: string) {
    aplicada.current = valor;
    setTexto(valor);
  }

  function limpiar() {
    adoptar('');
    confirmar.current('');
  }

  return { texto, setTexto, consulta: qUrl, limpiar, adoptar };
}

export function esPeticionCancelada(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
