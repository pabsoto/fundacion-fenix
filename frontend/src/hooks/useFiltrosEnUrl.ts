import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

type ModoHistorial = 'push' | 'replace';

function leerSesion(clave: string): string | null {
  try {
    return sessionStorage.getItem(clave);
  } catch {
    return null;
  }
}

function guardarSesion(clave: string, valor: string | null): void {
  try {
    if (valor) sessionStorage.setItem(clave, valor);
    else sessionStorage.removeItem(clave);
  } catch {
    /* El modo privado puede bloquear sessionStorage. La URL sigue funcionando. */
  }
}

/**
 * La URL es la fuente de verdad. Si se abre la pestaña sin parámetros,
 * recupera los últimos de esta sesión y los vuelve a poner en la URL.
 */
export function useFiltrosEnUrl<T>(
  clave: string,
  leer: (params: URLSearchParams) => T,
  escribir: (filtros: T) => URLSearchParams,
) {
  const [params, setParams] = useSearchParams();
  const filtros = leer(params);
  const leerRef = useRef(leer);
  const escribirRef = useRef(escribir);
  const yaPersistio = useRef(false);
  const yaRestaurado = useRef(false);

  useEffect(() => {
    leerRef.current = leer;
    escribirRef.current = escribir;
  });

  useLayoutEffect(() => {
    if (yaRestaurado.current) return;
    yaRestaurado.current = true;
    if (params.toString() !== '') return;
    const guardado = leerSesion(clave);
    if (!guardado) return;
    const restaurados = escribirRef.current(leerRef.current(new URLSearchParams(guardado)));
    if (restaurados.toString() === '') {
      guardarSesion(clave, null);
      return;
    }
    setParams(restaurados, { replace: true });
  }, [clave, params, setParams]);

  useEffect(() => {
    const canon = escribirRef.current(leerRef.current(params)).toString();
    if (canon !== params.toString()) {
      setParams(new URLSearchParams(canon), { replace: true });
      return;
    }
    if (canon) guardarSesion(clave, canon);
    else if (yaPersistio.current) guardarSesion(clave, null);
    yaPersistio.current = true;
  }, [clave, params, setParams]);

  const aplicar = useCallback(
    (siguiente: T, modo: ModoHistorial) => {
      setParams(escribirRef.current(siguiente), { replace: modo === 'replace' });
    },
    [setParams],
  );

  return { filtros, aplicar };
}
