import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, eyebrow, className }: SectionHeaderProps) {
  return (
    <div className={cn('mx-auto max-w-[760px] text-center', className)}>
      {eyebrow && <p className="mb-3 t-eyebrow text-negro">{eyebrow}</p>}
      <h2 className="mb-4 t-section text-negro">{title}</h2>
      {subtitle && <p className="t-body-lg text-negro">{subtitle}</p>}
    </div>
  );
}

