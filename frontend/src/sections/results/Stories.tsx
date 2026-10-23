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

export function Stories() {
  const { t } = useTranslation();
  const { data: stories = [] } = useStories();
  const { emblaRef, scrollPrev, scrollNext, canPrev, canNext } = useCarousel();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-center sm:text-left">
          {DEMO_SHOWCASE && <DemoBadge />}
          <p className="t-eyebrow mb-3 text-negro">{t('stories.eyebrow')}</p>
          <h3 className="t-heading-lg text-negro">{t('stories.title')}</h3>
        </div>
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
      </div>

      <Carousel emblaRef={emblaRef}>
        {stories.map((story) => {
          const statusLabel =
            story.status === 'adopted'
              ? t('stories.status_adopted')
              : t('stories.status_recovering');
          const badgeClass =
            story.status === 'adopted' ? 'bg-amarillo' : 'bg-naranja-hover';

          return (
            <article
              key={story.id}
              className="min-w-0 flex-[0_0_100%] overflow-hidden rounded-card border border-linea bg-blanco sm:flex-[0_0_calc(50%-12px)] lg:flex-[0_0_calc(33.333%-16px)]"
            >
              {story.photo ? (
                <Photo
                  src={story.photo}
                  alt={story.name}
                  radius="card"
                  className="h-[260px] w-full rounded-none rounded-t-card"
                />
              ) : (
                <div className="flex h-[260px] flex-col items-center justify-center gap-2.5 bg-linea">
                  <span className="t-eyebrow text-negro">
                    {t('stories.photo_placeholder')}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="t-heading-card text-negro">{story.name}</h4>
                  <span
                    className={cn(
                      'shrink-0 rounded-btn px-3 py-1 t-small text-negro',
                      badgeClass
                    )}
                  >
                    {statusLabel}
                  </span>
                </div>
                <p className="t-body text-negro">{t(story.textKey)}</p>
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
        })}
      </Carousel>
      {stories.length === 0 && (
        <p className="t-body text-center text-negro" role="status">
          {t('stories.empty')}
        </p>
      )}
    </div>
  );
}
