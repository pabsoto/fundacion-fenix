import { cn } from '@/lib/cn';
import type { useCarousel } from '@/hooks/useCarousel';

interface CarouselProps {
  emblaRef: ReturnType<typeof useCarousel>['emblaRef'];
  children: React.ReactNode;
  className?: string;
  gapClassName?: string;
}

export function Carousel({
  emblaRef,
  children,
  className,
  gapClassName = 'gap-6',
}: CarouselProps) {
  return (
    <div className={cn('overflow-hidden', className)} ref={emblaRef}>
      <div className={cn('flex touch-pan-y', gapClassName)}>{children}</div>
    </div>
  );
}
