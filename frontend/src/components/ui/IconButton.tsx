import { cn } from '@/lib/cn';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function IconButton({ children, className, ...props }: IconButtonProps) {
  return (
    <button
      className={cn(
        'flex h-12 w-12 items-center justify-center rounded-full bg-blanco border border-linea transition-colors hover:bg-crema',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

