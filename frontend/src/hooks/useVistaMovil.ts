import { useEffect, useState } from 'react';

/** Por debajo del breakpoint tablet (48rem / 768 px). */
const CONSULTA_MOVIL = '(width < 48rem)';

function esMovil(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(CONSULTA_MOVIL).matches;
}

export function useVistaMovil(): boolean {
  const [movil, setMovil] = useState(esMovil);

  useEffect(() => {
    const media = window.matchMedia(CONSULTA_MOVIL);
    const aplicar = () => setMovil(media.matches);
    aplicar();
    media.addEventListener('change', aplicar);
    return () => media.removeEventListener('change', aplicar);
  }, []);

  return movil;
}
