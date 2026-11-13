import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { useVistaMovil } from '@/hooks/useVistaMovil';
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

function PanelCargandoMovil() {
  return (
    <div className="flex flex-col gap-(--spacing-bloque-movil)" aria-busy="true">
      <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
      <div className="grid grid-cols-2 gap-(--spacing-kpi-gap-movil)">
        {['a', 'b', 'c', 'd'].map((clave) => (
          <div key={clave} className="h-28 animate-pulse rounded-admin bg-crema-tono" />
        ))}
      </div>
      <div className="h-grafica-movil animate-pulse rounded-admin bg-crema-tono" />
      <div className="h-48 animate-pulse rounded-admin bg-crema-tono" />
    </div>
  );
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
  movil = false,
}: {
  valor: number;
  maximo: number;
  tono: 'ingresos' | 'adopciones';
  movil?: boolean;
}) {
  const vacia = valor === 0 || maximo === 0;
  const altoMax = movil ? 'var(--spacing-barra-max-movil)' : 'var(--spacing-barra-max-admin)';
  return (
    <span className="flex flex-col items-center justify-end gap-1">
      <span
        className={cn(movil ? 't-cifra-movil' : 't-cifra-barra', 'text-negro', vacia && 'invisible')}
        aria-hidden="true"
      >
        {vacia ? '0' : formatNumber(valor, 'es')}
      </span>
      <span
        className={cn(
          'shrink-0',
          movil ? 'w-barra-movil' : 'w-barra-admin',
          tono === 'ingresos' ? 'bg-amarillo' : 'bg-naranja',
          vacia
            ? 'h-barra-cero-admin rounded-barra-cero opacity-35'
            : movil
              ? 'rounded-barra-movil'
              : 'rounded-barra-admin',
        )}
        style={
          vacia
            ? undefined
            : {
                height: `max(var(--spacing-barra-cero-admin), calc(${altoMax} * ${valor} / ${maximo}))`,
              }
        }
      />
    </span>
  );
}

function descripcionGrafica(puntos: PuntoMensual[]): string {
  const textos = textosAdmin.resumen;
  return puntos
    .map((punto) => {
      const mes = textos.meses[punto.mes - 1] ?? '';
      return `${mes}: ${formatNumber(punto.ingresos, 'es')} ${textos.ingresos}, ${formatNumber(punto.adopciones, 'es')} ${textos.adopcionesLeyenda}`;
    })
    .join('. ');
}

function Columnas({
  puntos,
  maximo,
  movil,
  ultimo,
}: {
  puntos: PuntoMensual[];
  maximo: number;
  movil: boolean;
  ultimo: string;
}) {
  const textos = textosAdmin.resumen;
  return (
    <>
      {puntos.map((punto) => {
        const clave = `${punto.anio}-${punto.mes}`;
        const activo = movil && clave === ultimo;
        return (
          <div
            key={clave}
            className={cn(
              'flex flex-col items-center justify-end',
              movil
                ? 'w-mes-movil shrink-0 gap-(--spacing-cabecera-movil)'
                : 'min-w-0 flex-1 gap-2.5',
              activo &&
                'bg-crema-tono rounded-mes-activo px-(--spacing-mes-activo-x) py-(--spacing-mes-activo-y)',
            )}
          >
            <span
              className={cn(
                'flex items-end justify-center',
                movil ? 'gap-entre-barras-movil' : 'gap-entre-barras',
              )}
            >
              <Barra valor={punto.ingresos} maximo={maximo} tono="ingresos" movil={movil} />
              <Barra valor={punto.adopciones} maximo={maximo} tono="adopciones" movil={movil} />
            </span>
            <span className={cn(movil ? 't-nota' : 't-small', 'text-negro')}>
              {textos.meses[punto.mes - 1]}
            </span>
          </div>
        );
      })}
    </>
  );
}

function Grafica({ puntos, movil = false }: { puntos: PuntoMensual[]; movil?: boolean }) {
  const textos = textosAdmin.resumen;
  const carril = useRef<HTMLDivElement>(null);
  const [puedeRetroceder, setPuedeRetroceder] = useState(false);
  const maximo = Math.max(0, ...puntos.flatMap((punto) => [punto.ingresos, punto.adopciones]));
  const descripcion = descripcionGrafica(puntos);
  const ultimo = puntos.length > 0 ? `${puntos[puntos.length - 1]?.anio}-${puntos[puntos.length - 1]?.mes}` : '';

  useLayoutEffect(() => {
    if (!movil) return;
    const el = carril.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    setPuedeRetroceder(el.scrollWidth - el.clientWidth > 8);
  }, [movil, puntos]);

  if (puntos.length === 0) {
    return <p className="t-small text-negro">{textosAdmin.supuestos.vacio}</p>;
  }

  if (!movil) {
    return (
      <div
        className="flex h-grafica-admin items-end gap-2.5"
        role="img"
        aria-label={`${textos.grafica}. ${descripcion}`}
      >
        <Columnas puntos={puntos} maximo={maximo} movil={false} ultimo={ultimo} />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-(--spacing-card-gap-movil)">
      <div
        ref={carril}
        className="flex h-grafica-movil w-full items-end overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="img"
        aria-label={`${textos.grafica}. ${descripcion}`}
        onScroll={(event) => setPuedeRetroceder(event.currentTarget.scrollLeft > 4)}
      >
        <Columnas puntos={puntos} maximo={maximo} movil ultimo={ultimo} />
      </div>
      {puedeRetroceder ? (
        <p className="text-negro flex items-center gap-(--spacing-pista)">
          <ChevronLeft className="size-(--size-pista) shrink-0" aria-hidden="true" />
          <span className="t-foto">{textos.desliza}</span>
        </p>
      ) : null}
    </div>
  );
}

function ListaEspera({ resumen }: { resumen: Resumen }) {
  const textos = textosAdmin.resumen;
  if (resumen.espera.length === 0) {
    return <p className="t-small text-negro">{textosAdmin.supuestos.vacio}</p>;
  }
  return (
    <ul className="flex flex-col">
      {resumen.espera.map((animal) => (
        <li
          key={animal.id}
          className="border-linea flex h-dato-admin items-center justify-between gap-3 border-b"
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
  );
}

function PanelResumenMovil({ resumen }: { resumen: Resumen }) {
  const textos = textosAdmin.resumen;
  return (
    <div className="flex flex-col gap-(--spacing-bloque-movil)">
      <div className="grid grid-cols-2 gap-(--spacing-kpi-gap-movil)">
        <TarjetaKpi
          suelta
          destacada
          etiqueta={textos.esterilizaciones}
          valor={formatNumber(resumen.esterilizaciones.total, 'es')}
          nota={textos.enJornadas(resumen.esterilizaciones.jornadas)}
        />
        <TarjetaKpi
          suelta
          etiqueta={textos.enLaFundacion}
          valor={formatNumber(resumen.enLaFundacion.cantidad, 'es')}
          nota={textos.deRegistrados(resumen.enLaFundacion.registrados)}
        />
        <TarjetaKpi
          suelta
          etiqueta={textos.adopciones}
          valor={formatNumber(resumen.adopcionesDelAnio.cantidad, 'es')}
          nota={textos.enLoQueVa(resumen.adopcionesDelAnio.anio)}
        />
        <TarjetaKpi
          suelta
          etiqueta={textos.diasHastaAdoptar}
          valor={valorDias(resumen.diasHastaAdoptar)}
          nota={textos.promedio}
        />
      </div>
      <Card
        radius="admin"
        elevated="panel"
        className="flex flex-col gap-(--spacing-card-gap-movil) p-(--spacing-card-movil)"
      >
        <div className="flex flex-col gap-(--spacing-cabecera-movil)">
          <div className="flex flex-col gap-0.5">
            <h2 className="t-barra text-negro">{textos.grafica}</h2>
            <p className="t-small text-negro">{textos.graficaPeriodo}</p>
          </div>
          <div className="flex items-center gap-leyenda-admin">
            <Leyenda color="bg-amarillo" texto={textos.ingresos} />
            <Leyenda color="bg-naranja" texto={textos.adopcionesLeyenda} />
          </div>
        </div>
        <Grafica puntos={resumen.serie} movil />
      </Card>
      <Card radius="admin" elevated="panel" className="flex flex-col gap-3 p-(--spacing-card-movil)">
        <div className="flex flex-col gap-0.5">
          <h2 className="t-barra text-negro">{textos.espera}</h2>
          <p className="t-small text-negro">{textos.esperaNota}</p>
        </div>
        <ListaEspera resumen={resumen} />
      </Card>
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
  const movil = useVistaMovil();
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
    <div
      className={cn(
        'flex min-h-0 flex-1 flex-col',
        movil ? 'gap-(--spacing-bloque-movil)' : 'gap-(--spacing-bloque-gap-admin)',
      )}
    >
      <header className="flex flex-col gap-(--spacing-titulo-pagina-admin)">
        <h1 className={cn(movil ? 't-pagina-movil' : 't-pagina', 'text-negro')}>{textos.titulo}</h1>
        <p className={cn(movil ? 't-control' : 't-subtitulo', 'text-negro')}>{textos.subtitulo}</p>
      </header>

      {carga === 'cargando' ? movil ? <PanelCargandoMovil /> : <PanelCargando /> : null}

      {carga === 'error' ? (
        <Card
          radius="admin"
          elevated="panel"
          className={cn('flex flex-col items-start gap-4', movil ? 'p-(--spacing-card-movil)' : 'p-7')}
        >
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

      {carga === 'listo' && resumen ? (
        movil ? (
          <PanelResumenMovil resumen={resumen} />
        ) : (
          <PanelResumen resumen={resumen} />
        )
      ) : null}
    </div>
  );
}
