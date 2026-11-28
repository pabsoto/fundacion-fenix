import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Carousel } from '@/components/ui/Carousel';
import { IconButton } from '@/components/ui/IconButton';
import { Photo } from '@/components/ui/Photo';
import { cn } from '@/lib/cn';
import { useCarousel } from '@/hooks/useCarousel';
import { useStories } from '@/hooks/useStories';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { DEMO_SHOWCASE } from '@/lib/demo';
import { formatStoryDate } from '@/lib/format';
import type { Story } from '@/types';

type TarjetaHistoriaProps = {
  story: Story;
  lang: 'es' | 'en';
  className?: string;
  /** Muestra la foto completa, sin recorte ni deformación. */
  encajarFoto?: boolean;
};

/** Tarjeta pública de una historia. La landing y la vista previa del panel usan la misma. */
export function TarjetaHistoria({
  story,
  lang,
  className,
  encajarFoto = false,
}: TarjetaHistoriaProps) {
  const { i18n } = useTranslation();
  const t = i18n.getFixedT(lang);
  const [fotoRota, setFotoRota] = useState(false);
  const hayFoto = Boolean(story.photo) && !fotoRota;

  return (
    <article
      className={cn(
        'min-w-0 overflow-hidden rounded-card border border-linea bg-blanco',
        className,
      )}
    >
      {hayFoto ? (
        encajarFoto ? (
          <img
            src={story.photo}
            alt={story.animalName}
            width={story.photoWidth || undefined}
            height={story.photoHeight || undefined}
            loading="lazy"
            onError={() => setFotoRota(true)}
            className="mx-auto block h-auto max-h-[420px] w-auto max-w-full object-contain"
          />
        ) : (
          <Photo
            src={story.photo}
            alt={story.animalName}
            radius="card"
            className="h-[260px] w-full rounded-none rounded-t-card"
          />
        )
      ) : (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2.5 bg-linea">
          <span className="t-eyebrow text-negro">{t('stories.photo_placeholder')}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 p-6">
        <p className="t-small text-negro">
          {story.animalName} · <time dateTime={story.date}>{formatStoryDate(story.date, lang)}</time>
        </p>
        <h4 className="t-heading-card text-negro">{story.title[lang]}</h4>
        <p className="t-body text-negro">{story.text[lang]}</p>
        {story.author && (
          <p className="t-small text-negro">{t('stories.by_author', { author: story.author })}</p>
        )}
        <a
          href="#historias"
          className="t-body-strong inline-flex items-center gap-2 text-negro underline underline-offset-2"
          onClick={(e) => e.preventDefault()}
        >
          {t('stories.read_more')}
        </a>
      </div>
    </article>
  );
}

/** Con 3 historias o menos la sección es una cuadrícula; a partir de 4, carrusel. */
const LIMITE_CUADRICULA = 3;

export function Stories() {
  const { t, i18n } = useTranslation();
  const lang: 'es' | 'en' = i18n.language?.startsWith('en') ? 'en' : 'es';
  const { data: stories = [], isPending, isError } = useStories();
  const { emblaRef, scrollPrev, scrollNext, canPrev, canNext } = useCarousel();
  const usarCarrusel = !isPending && !isError && stories.length > LIMITE_CUADRICULA;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          {DEMO_SHOWCASE && <DemoBadge />}
          <p className="t-eyebrow mb-3 text-negro">{t('stories.eyebrow')}</p>
          <h3 className="t-heading-lg text-negro">{t('stories.title')}</h3>
        </div>
        {usarCarrusel && (
          <div className="flex justify-center gap-3 sm:justify-end">
            <IconButton
              type="button"
              aria-label={t('stories.prev')}
              onClick={scrollPrev}
              disabled={!canPrev}
              className={cn(!canPrev && 'cursor-not-allowed opacity-40')}
            >
              <ArrowLeft className="h-5 w-5 text-negro" aria-hidden />
            </IconButton>
            <IconButton
              type="button"
              aria-label={t('stories.next')}
              onClick={scrollNext}
              disabled={!canNext}
              className={cn(!canNext && 'cursor-not-allowed opacity-40')}
            >
              <ArrowRight className="h-5 w-5 text-negro" aria-hidden />
            </IconButton>
          </div>
        )}
      </div>

      {isPending || isError ? (
        <p className="t-body text-center text-negro" role="status">
          {isPending ? t('stories.loading') : t('stories.error')}
        </p>
      ) : stories.length === 0 ? (
        <p className="t-body text-center text-negro" role="status">
          {t('stories.empty')}
        </p>
      ) : usarCarrusel ? (
        <Carousel emblaRef={emblaRef}>
          {stories.map((story) => (
            <TarjetaHistoria
              key={story.id}
              story={story}
              lang={lang}
              encajarFoto
              className="flex-[0_0_100%] sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
            />
          ))}
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <TarjetaHistoria key={story.id} story={story} lang={lang} encajarFoto />
          ))}
        </div>
      )}
    </div>
  );
}
