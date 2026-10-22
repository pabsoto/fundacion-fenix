import { cn } from '@/lib/cn';
import { FlameIcon } from './icons';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amarillo">
        <FlameIcon className="h-6 w-6" />
      </div>
      <div>
        <div className="t-heading-card text-negro">Fénix LPB</div>
        <div className="t-eyebrow text-negro">FUNDACIÓN</div>
      </div>
    </div>
  );
}

