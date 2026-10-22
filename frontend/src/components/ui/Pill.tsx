import { cn } from '@/lib/cn';

interface PillProps {
  children: React.ReactNode;
  className?: string;
}

export function Pill({ children, className }: PillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 t-nav bg-crema-vidrio backdrop-blur text-negro',
        className
      )}
    >
      <span className="flex h-2.5 w-2.5 rounded-full bg-amarillo" />
      {children}
    </div>
  );
}

