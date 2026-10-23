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
    <section id={id} className={cn('relative w-full overflow-x-clip', bgClass, className)}>
      {decor && (
        <>
          <PawIcon className="pointer-events-none absolute top-8 right-8 -z-10 hidden size-[140px] rotate-[18deg] text-negro opacity-[0.10] md:block" />
          <PawIcon className="pointer-events-none absolute bottom-8 left-8 -z-10 hidden size-[150px] -rotate-[16deg] text-negro opacity-[0.10] md:block" />
        </>
      )}
      <div className="relative z-0 mx-auto w-full max-w-[1264px] px-6 py-[72px] lg:px-8 lg:py-[96px]">
        {children}
      </div>
    </section>
  );
}
