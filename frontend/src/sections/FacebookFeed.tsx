import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { usePublicContacts } from '@/hooks/usePublicContacts';
import { isValidFacebookPageUrl } from '@/services/contacts.service';

const ANCHO_MINIMO = 180;
const ANCHO_MAXIMO = 500;
const ALTO_WIDGET = 700;

function limitarAncho(ancho: number): number {
  return Math.min(ANCHO_MAXIMO, Math.max(ANCHO_MINIMO, Math.floor(ancho)));
}

function crearUrlWidget(urlPagina: string, ancho: number): string {
  const url = new URL('https://www.facebook.com/plugins/page.php');
  url.searchParams.set('href', urlPagina);
  url.searchParams.set('tabs', 'timeline');
  url.searchParams.set('width', String(ancho));
  url.searchParams.set('height', String(ALTO_WIDGET));
  url.searchParams.set('adapt_container_width', 'true');
  url.searchParams.set('hide_cover', 'false');
  url.searchParams.set('show_facepile', 'false');
  return url.toString();
}

export function FacebookFeed() {
  const { t } = useTranslation();
  const { find, isError, isPending } = usePublicContacts();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(ANCHO_MAXIMO);
  const canal = find('facebook');
  const urlFacebook = canal && isValidFacebookPageUrl(canal.url) ? canal.url : null;

  useEffect(() => {
    const contenedor = contenedorRef.current;
    if (!contenedor || typeof ResizeObserver === 'undefined') return;

    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setAncho((actual) => {
        const siguiente = limitarAncho(entrada.contentRect.width);
        return actual === siguiente ? actual : siguiente;
      });
    });
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [urlFacebook]);

  return (
    <div className="flex flex-col items-center gap-10">
      <div className="text-center">
        <p className="t-eyebrow mb-4 text-negro">{t('facebook.eyebrow')}</p>
        <h2 className="t-section text-negro">{t('facebook.title')}</h2>
      </div>

      <div className="flex w-full max-w-[800px] flex-col items-center justify-center gap-6 rounded-panel border-[1.5px] border-dashed border-linea bg-blanco p-8 md:p-12">
        {urlFacebook ? (
          <>
            <div
              ref={contenedorRef}
              className="w-full max-w-[500px]"
              data-testid="facebook-widget-container"
            >
              <iframe
                title={t('facebook.iframeTitle')}
                src={crearUrlWidget(urlFacebook, ancho)}
                width={ancho}
                height={ALTO_WIDGET}
                loading="lazy"
                scrolling="no"
                allow="encrypted-media; picture-in-picture; web-share"
                className="block min-w-[180px] max-w-full border-0"
                style={{ width: '100%', maxWidth: 500, minWidth: 180 }}
              />
            </div>
            <Button
              href={urlFacebook}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="md"
            >
              {t('facebook.open')}
            </Button>
            <p className="t-small text-center text-negro">{t('facebook.note')}</p>
          </>
        ) : (
          <p className="t-body text-center text-negro" role="status">
            {isPending
              ? t('facebook.loading')
              : isError
                ? t('facebook.error')
                : t('facebook.unavailable')}
          </p>
        )}
      </div>
    </div>
  );
}
