import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, eyebrow, className }: SectionHeaderProps) {
  return (
    <div className={cn('mx-auto mb-12 max-w-[760px] text-center', className)}>
      {eyebrow && <p className="mb-3 t-eyebrow text-negro">{eyebrow}</p>}
      <h2 className="t-section text-negro">{title}</h2>
      {subtitle && <p className="mt-4 t-body-lg text-negro">{subtitle}</p>}
    </div>
  );
}
