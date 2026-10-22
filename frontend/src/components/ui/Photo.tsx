import { useState } from 'react';
import { cn } from '@/lib/cn';
import { PawIcon } from './icons';

interface PhotoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt: string;
  radius?: 'card' | 'panel' | 'btn' | 'full';
}

export function Photo({ alt, radius = 'card', className, ...props }: PhotoProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const radiusClass = {
    card: 'rounded-card',
    panel: 'rounded-panel',
    btn: 'rounded-btn',
    full: 'rounded-full',
  }[radius];

  if (!props.src || hasError) {
    return (
      <div
        className={cn(
          'flex aspect-square flex-col items-center justify-center bg-linea',
          radiusClass,
          className
        )}
        role="img"
        aria-label={alt}
      >
        <PawIcon className="mb-2 h-8 w-8 text-negro opacity-30" />
        <span className="t-small text-negro opacity-80">{alt}</span>
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={cn('object-cover', radiusClass, isLoading && 'opacity-0', className)}
      loading="lazy"
      onLoad={() => setIsLoading(false)}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}
