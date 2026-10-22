import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-btn t-button transition-colors duration-200',
  {
    variants: {
      variant: {
        primary: 'bg-naranja text-negro hover:bg-naranja-hover',
        secondary:
          'bg-transparent border-[1.5px] border-negro text-negro hover:bg-negro hover:text-crema',
        dark: 'bg-negro text-crema',
      },
      size: {
        md: 'px-6 py-3',
        lg: 'px-8 py-4',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface BaseButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
  children: React.ReactNode;
}

interface ButtonAsButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    BaseButtonProps {
  href?: never;
  to?: never;
}

interface ButtonAsLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>,
    BaseButtonProps {
  href: string;
  to?: never;
}

interface ButtonAsToProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'children'>,
    BaseButtonProps {
  href?: never;
  to: string;
}

type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps | ButtonAsToProps;

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: ButtonProps) {
  if ('href' in props && props.href) {
    const { href, ...anchorProps } = props as ButtonAsLinkProps;
    return (
      <a
        href={href}
        className={cn(buttonVariants({ variant, size }), className)}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  if ('to' in props && props.to) {
    const { to, ...anchorProps } = props as ButtonAsToProps;
    return (
      <a
        href={to}
        className={cn(buttonVariants({ variant, size }), className)}
        {...anchorProps}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  );
}

