import { Chip } from '@/components/ui/Chip';

type ChipFiltroProps = {
  children: React.ReactNode;
  activo?: boolean;
  onClick: () => void;
  className?: string;
};

/** Chip de filtro o de opción. Activo: negro sobre crema. Inactivo: borde línea. */
export function ChipFiltro({ children, activo = false, onClick, className }: ChipFiltroProps) {
  return (
    <Chip
      variant={activo ? 'filtroActivo' : 'filtro'}
      onClick={onClick}
      pressed={activo}
      className={className}
    >
      {children}
    </Chip>
  );
}
