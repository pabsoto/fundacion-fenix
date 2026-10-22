import { cn } from '@/lib/cn';
import { PawIcon } from './icons';

interface SectionBandProps {
  id?: string;
  tone: 'crema' | 'tono';
  decor?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SectionBand({ id, tone, decor = false, children, className }: SectionBandProps) {
  const bgClass = tone === 'crema' ? 'bg-crema' : 'bg-crema-tono';

  return (
    <section id={id} className={cn('w-full', bgClass, className)}>
      <div className="relative mx-auto max-w-[1200px] px-6 py-[72px] lg:px-8 lg:py-[96px]">
        {decor && tone === 'tono' && (
          <>
            <PawIcon
              className="absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 opacity-[0.14]"
              style={{ width: '120px', height: '120px' }}
            />
            <PawIcon
              className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2 opacity-[0.14]"
              style={{ width: '120px', height: '120px' }}
            />
          </>
        )}
        {children}
      </div>
    </section>
  );
}

