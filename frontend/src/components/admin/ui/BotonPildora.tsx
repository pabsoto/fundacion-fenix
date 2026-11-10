import { Button } from '@/components/ui/Button';

type BotonPildoraProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'naranja' | 'ghost';
  children: React.ReactNode;
};

/** Botón del panel: píldora naranja (texto negro) o ghost con borde negro. */
export function BotonPildora({
  variante = 'naranja',
  className,
  children,
  type = 'button',
  ...props
}: BotonPildoraProps) {
  return (
    <Button variant={variante} size="pill" className={className} type={type} {...props}>
      {children}
    </Button>
  );
}
