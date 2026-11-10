import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const chipVariants = cva('inline-flex items-center rounded-full', {
  variants: {
    variant: {
      default: 'gap-2 border border-linea bg-blanco px-4 py-2 t-nav text-negro',
      'solid-crema': 'gap-2 bg-crema px-4 py-2 t-nav text-negro',
      filtro: 'border border-linea bg-blanco px-chip-admin py-chip-admin-y t-chip text-negro',
      filtroActivo: 'bg-negro px-chip-admin py-chip-admin-y t-chip text-crema',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface ChipProps extends VariantProps<typeof chipVariants> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  pressed?: boolean;
}

export function Chip({ variant = 'default', children, className, onClick, pressed }: ChipProps) {
  const classes = cn(chipVariants({ variant }), className);
  const content = (
    <>
      {variant === 'default' && <span className="flex h-2.5 w-2.5 rounded-full bg-amarillo" />}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={cn(classes, 'cursor-pointer')}
        onClick={onClick}
        aria-pressed={pressed}
      >
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

