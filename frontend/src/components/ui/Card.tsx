import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva('bg-blanco border border-linea', {
  variants: {
    radius: {
      card: 'rounded-card',
      panel: 'rounded-panel',
    },
    elevated: {
      false: '',
      soft: 'shadow-soft',
      lift: 'shadow-lift',
    },
  },
  defaultVariants: {
    radius: 'card',
    elevated: false,
  },
});

interface CardProps
  extends VariantProps<typeof cardVariants>,
    React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ radius, elevated, children, className, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ radius, elevated }), className)} {...props}>
      {children}
    </div>
  );
}

