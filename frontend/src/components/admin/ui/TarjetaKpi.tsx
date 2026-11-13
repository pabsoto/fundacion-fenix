import { cn } from '@/lib/cn';
import { Card } from '@/components/ui/Card';

type TarjetaKpiProps = {
  etiqueta: string;
  valor: string;
  nota: string;
  destacada?: boolean;
  separador?: boolean;
  /** Tarjeta suelta del Resumen móvil (2×2), no la fila del escritorio. */
  suelta?: boolean;
};

export function TarjetaKpi({
  etiqueta,
  valor,
  nota,
  destacada = false,
  separador = false,
  suelta = false,
}: TarjetaKpiProps) {
  if (suelta) {
    return (
      <Card
        radius="admin"
        className={cn(
          'flex h-full min-w-0 flex-col gap-(--spacing-kpi-interno) p-(--spacing-kpi-movil)',
          destacada ? 'border-0 bg-amarillo' : 'border-negro shadow-kpi-admin',
        )}
      >
        <p className="t-chip text-negro">{etiqueta}</p>
        <p className="t-kpi-movil text-negro">{valor}</p>
        <p className="t-nota text-negro">{nota}</p>
      </Card>
    );
  }

  const contenido = (
    <>
      <p className="t-nav text-negro">{etiqueta}</p>
      <p className="t-kpi text-negro">{valor}</p>
      <p className="t-small text-negro">{nota}</p>
    </>
  );

  if (destacada) {
    return (
      <Card className="flex min-w-0 flex-1 flex-col gap-1.5 border-0 bg-amarillo px-6 py-5">
        {contenido}
      </Card>
    );
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1.5 px-6 py-5',
        separador && 'border-r border-linea',
      )}
    >
      {contenido}
    </div>
  );
}
