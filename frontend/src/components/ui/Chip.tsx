import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const chipVariants = cva(
  'inline-flex items-center gap-2 rounded-full px-4 py-2 t-nav',
  {
    variants: {
      variant: {
        default: 'bg-blanco border border-linea text-negro',
        'solid-crema': 'bg-crema text-negro',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ChipProps extends VariantProps<typeof chipVariants> {
  children: React.ReactNode;
  className?: string;
}

export function Chip({ variant, children, className }: ChipProps) {
  return (
    <div className={cn(chipVariants({ variant }), className)}>
      {variant === 'default' && (
        <span className="flex h-2.5 w-2.5 rounded-full bg-amarillo" />
      )}
      {children}
    </div>
  );
}

