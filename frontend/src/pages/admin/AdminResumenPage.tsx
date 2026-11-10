import { useEffect, useState } from 'react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { getResumen } from '@/services/admin/resumen.service';
import type { PuntoMensual, Resumen } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { TarjetaKpi } from '@/components/admin/ui/TarjetaKpi';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

type Carga = 'cargando' | 'listo' | 'error';

function inicialDe(nombre: string): string {
  const letra = Array.from(nombre.trim())[0];
  return letra ? letra.toLocaleUpperCase('es') : '';
}

function especieVisible(especie: Resumen['espera'][number]['especie']): string {
  return especie === 'perro' ? textosAdmin.registrarAnimal.perro : textosAdmin.registrarAnimal.gato;
}

function valorDias(dias: number | null): string {
  return dias === null ? textosAdmin.animales.sinAdoptante : formatNumber(dias, 'es');
}

function PanelCargando() {
  return (
    <Card radius="admin" elevated="panel" className="flex flex-col" aria-busy="true">
      <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
      <div className="flex gap-3 p-3">
        <div className="h-24 flex-1 animate-pulse rounded-card bg-crema-tono" />
        <div className="h-24 flex-1 animate-pulse rounded-card bg-crema-tono" />
        <div className="h-24 flex-1 animate-pulse rounded-card bg-crema-tono" />
        <div className="h-24 flex-1 animate-pulse rounded-card bg-crema-tono" />
      </div>
      <div className="bg-linea h-px" />
      <div className="flex">
        <div className="h-grafica-admin m-7 flex-1 animate-pulse rounded-card bg-crema-tono" />
        <div className="w-panel-detalle flex shrink-0 flex-col gap-3 border-l border-linea p-7">
          <div className="h-dato-admin animate-pulse rounded-btn bg-crema-tono" />
          <div className="h-dato-admin animate-pulse rounded-btn bg-crema-tono" />
          <div className="h-dato-admin animate-pulse rounded-btn bg-crema-tono" />
          <div className="h-dato-admin animate-pulse rounded-btn bg-crema-tono" />
        </div>
      </div>
    </Card>
  );
}

function Leyenda({ color, texto }: { color: 'bg-amarillo' | 'bg-naranja'; texto: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn('size-2.5 shrink-0 rounded-pill', color)} aria-hidden="true" />
      <span className="t-small text-negro">{texto}</span>
    </span>
  );
}

function Barra({
  valor,
  maximo,
  tono,
}: {
  valor: number;
  maximo: number;
  tono: 'ingresos' | 'adopciones';
}) {
  const vacia = valor === 0 || maximo === 0;
  return (
    <span className="flex flex-col items-center justify-end gap-1">
      <span className={cn('t-cifra-barra text-negro', vacia && 'invisible')} aria-hidden="true">
        {vacia ? '0' : formatNumber(valor, 'es')}
      </span>
      <span
        className={cn(
          'w-barra-admin shrink-0',
          tono === 'ingresos' ? 'bg-amarillo' : 'bg-naranja',
          vacia ? 'h-barra-cero-admin rounded-barra-cero opacity-35' : 'rounded-barra-admin',
        )}
        style={
          vacia
            ? undefined
            : {
                height: `max(var(--spacing-barra-cero-admin), calc(var(--spacing-barra-max-admin) * ${valor} / ${maximo}))`,
              }
        }
      />
    </span>
  );
}

function Grafica({ puntos }: { puntos: PuntoMensual[] }) {
  const textos = textosAdmin.resumen;
  const maximo = Math.max(0, ...puntos.flatMap((punto) => [punto.ingresos, punto.adopciones]));
  const descripcion = puntos
    .map((punto) => {
      const mes = textos.meses[punto.mes - 1] ?? '';
      return `${mes}: ${formatNumber(punto.ingresos, 'es')} ${textos.ingresos}, ${formatNumber(punto.adopciones, 'es')} ${textos.adopcionesLeyenda}`;
    })
    .join('. ');

  if (puntos.length === 0) {
    return <p className="t-small text-negro">{textosAdmin.supuestos.vacio}</p>;
  }

  return (
    <div
      className="flex h-grafica-admin items-end gap-2.5"
      role="img"
      aria-label={`${textos.grafica}. ${descripcion}`}
    >
      {puntos.map((punto) => (
        <div
          key={`${punto.anio}-${punto.mes}`}
          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2.5"
        >
          <span className="flex items-end justify-center gap-entre-barras">
            <Barra valor={punto.ingresos} maximo={maximo} tono="ingresos" />
            <Barra valor={punto.adopciones} maximo={maximo} tono="adopciones" />
          </span>
          <span className="t-small text-negro">{textos.meses[punto.mes - 1]}</span>
        </div>
      ))}
    </div>
  );
}

function PanelResumen({ resumen }: { resumen: Resumen }) {
  const textos = textosAdmin.resumen;

  return (
    <Card radius="admin" elevated="panel" className="flex flex-col">
      <div className="flex items-start p-3">
        <TarjetaKpi
          destacada
          etiqueta={textos.esterilizaciones}
          valor={formatNumber(resumen.esterilizaciones.total, 'es')}
          nota={textos.enJornadas(resumen.esterilizaciones.jornadas)}
        />
        <TarjetaKpi
          separador
          etiqueta={textos.enLaFundacion}
          valor={formatNumber(resumen.enLaFundacion.cantidad, 'es')}
          nota={textos.deRegistrados(resumen.enLaFundacion.registrados)}
        />
        <TarjetaKpi
          separador
          etiqueta={textos.adopciones}
          valor={formatNumber(resumen.adopcionesDelAnio.cantidad, 'es')}
          nota={textos.enLoQueVa(resumen.adopcionesDelAnio.anio)}
        />
        <TarjetaKpi
          etiqueta={textos.diasHastaAdoptar}
          valor={valorDias(resumen.diasHastaAdoptar)}
          nota={textos.promedio}
        />
      </div>
      <div className="bg-linea h-px" />
      <div className="flex items-stretch">
        <section className="flex min-w-0 flex-1 flex-col justify-between self-stretch px-7 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 className="t-barra text-negro">{textos.grafica}</h2>
              <p className="t-small text-negro">{textos.graficaNota}</p>
            </div>
            <div className="flex shrink-0 items-center gap-leyenda-admin">
              <Leyenda color="bg-amarillo" texto={textos.ingresos} />
              <Leyenda color="bg-naranja" texto={textos.adopcionesLeyenda} />
            </div>
          </div>
          <Grafica puntos={resumen.serie} />
        </section>
        <section className="flex w-panel-detalle shrink-0 flex-col gap-3 self-stretch border-l border-linea p-7">
          <div className="flex flex-col gap-0.5">
            <h2 className="t-barra text-negro">{textos.espera}</h2>
            <p className="t-small text-negro">{textos.esperaNota}</p>
          </div>
          {resumen.espera.length === 0 ? (
            <p className="t-small text-negro">{textosAdmin.supuestos.vacio}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {resumen.espera.map((animal) => (
                <li
                  key={animal.id}
                  className="flex h-dato-admin items-center justify-between gap-3 border-b border-linea"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="t-inicial bg-crema-tono text-negro flex size-inicial shrink-0 items-center justify-center rounded-pill">
                      {inicialDe(animal.nombre)}
                    </span>
                    <span className="t-control text-negro truncate">{animal.nombre}</span>
                    <span className="t-small text-negro shrink-0">{especieVisible(animal.especie)}</span>
                  </span>
                  <span className="t-nav text-negro shrink-0">{textos.dias(animal.dias)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Card>
  );
}

export function AdminResumenPage() {
  const textos = textosAdmin.resumen;
  const [carga, setCarga] = useState<Carga>('cargando');
  const [intento, setIntento] = useState(0);
  const [resumen, setResumen] = useState<Resumen | null>(null);

  useEffect(() => {
    let vivo = true;
    getResumen()
      .then((datos) => {
        if (!vivo) return;
        setResumen(datos);
        setCarga('listo');
      })
      .catch(() => {
        if (!vivo) return;
        setCarga('error');
      });
    return () => {
      vivo = false;
    };
  }, [intento]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-(--spacing-bloque-gap-admin)">
      <header className="flex flex-col gap-(--spacing-titulo-pagina-admin)">
        <h1 className="t-pagina text-negro">{textos.titulo}</h1>
        <p className="t-subtitulo text-negro">{textos.subtitulo}</p>
      </header>

      {carga === 'cargando' ? <PanelCargando /> : null}

      {carga === 'error' ? (
        <Card radius="admin" elevated="panel" className="flex flex-col items-start gap-4 p-7">
          <p className="t-control text-negro" role="alert">
            {textosAdmin.supuestos.error}
          </p>
          <BotonPildora
            onClick={() => {
              setCarga('cargando');
              setIntento((valor) => valor + 1);
            }}
          >
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </Card>
      ) : null}

      {carga === 'listo' && resumen ? <PanelResumen resumen={resumen} /> : null}
    </div>
  );
}
