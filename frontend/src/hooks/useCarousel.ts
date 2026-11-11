import { useCallback, useSyncExternalStore } from 'react';
import useEmblaCarousel from 'embla-carousel-react';

type EmblaOptions = NonNullable<Parameters<typeof useEmblaCarousel>[0]>;

export function useCarousel(options?: EmblaOptions) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    ...options,
  });

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!emblaApi) return () => {};
      emblaApi.on('select', onStoreChange);
      emblaApi.on('reInit', onStoreChange);
      emblaApi.on('init', onStoreChange);
      return () => {
        emblaApi.off('select', onStoreChange);
        emblaApi.off('reInit', onStoreChange);
        emblaApi.off('init', onStoreChange);
      };
    },
    [emblaApi]
  );

  const canPrev = useSyncExternalStore(
    subscribe,
    () => emblaApi?.canScrollPrev() ?? false,
    () => false
  );

  const canNext = useSyncExternalStore(
    subscribe,
    () => emblaApi?.canScrollNext() ?? false,
    () => false
  );

  const selectedIndex = useSyncExternalStore(
    subscribe,
    () => emblaApi?.selectedScrollSnap() ?? 0,
    () => 0
  );

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((indice: number) => emblaApi?.scrollTo(indice), [emblaApi]);

  return {
    emblaRef,
    scrollPrev,
    scrollNext,
    scrollTo,
    canPrev,
    canNext,
    selectedIndex,
  };
}
