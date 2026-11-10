import { useEffect, useState } from 'react';
import { Cat, Hash, PawPrint } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { listCampanas, subirFotosCampana } from '@/services/admin/campanas.service';
import type { CampanaConTotales, ContadoresCampana } from '@/types/admin';
import { totalesDe } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { PanelDetalle } from '@/components/admin/ui/PanelDetalle';
import { TablaSeleccion, type ColumnaTabla } from '@/components/admin/ui/TablaSeleccion';
import { Card } from '@/components/ui/Card';
import { CampanaFormModal } from '@/pages/admin/CampanaFormModal';

type Carga = 'cargando' | 'listo' | 'error';
type FotoPendiente = { id: string; archivos: File[] };

const icono = 'size-4';

const MESES_CORTOS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  const nombre = mes ? MESES_CORTOS[mes - 1] : undefined;
  if (!anio || !dia || !nombre) return iso;
  return `${dia} ${nombre} ${anio}`;
}

function fuenteVisible(valor: string): string | null {
  if (
    valor.startsWith('blob:') ||
    valor.startsWith('data:') ||
    valor.startsWith('http') ||
    valor.startsWith('/')
  ) {
    return valor;
  }
  return null;
}

function encabezadoContador(texto: string) {
  const espacio = texto.indexOf(' ');
  if (espacio < 0) return texto;
  return (
    <span className="block text-right leading-none">
      <span className="block">{texto.slice(0, espacio)}</span>
      <span className="block">{texto.slice(espacio + 1)}</span>
    </span>
  );
}

function celdaNumero(valor: number) {
  return <span className="t-fila block text-right text-negro">{formatNumber(valor, 'es')}</span>;
}

function acumuladoDe(lista: CampanaConTotales[]): ContadoresCampana {
  return lista.reduce(
    (total, campana) => ({
      perrosMachos: total.perrosMachos + campana.perrosMachos,
      perrosHembras: total.perrosHembras + campana.perrosHembras,
      gatosMachos: total.gatosMachos + campana.gatosMachos,
      gatosHembras: total.gatosHembras + campana.gatosHembras,
    }),
    { perrosMachos: 0, perrosHembras: 0, gatosMachos: 0, gatosHembras: 0 },
  );
}

const COLUMNAS: ColumnaTabla<CampanaConTotales>[] = [
  {
    id: 'campana',
    encabezado: textosAdmin.campanas.columnas.campana,
    crece: true,
    className: 'min-w-col-campana',
    celda: (campana) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="t-fila truncate text-negro">{campana.titulo}</span>
        {campana.lugar ? <span className="t-small truncate text-negro">{campana.lugar}</span> : null}
      </span>
    ),
  },
  {
    id: 'fecha',
    encabezado: textosAdmin.campanas.columnas.fecha,
    className: 'w-col-fecha-admin',
    celda: (campana) => <span className="t-fila text-negro">{fechaCorta(campana.fecha)}</span>,
  },
  {
    id: 'perros-machos',
    encabezado: encabezadoContador(textosAdmin.campanas.columnas.perrosMachos),
    className: 'w-col-contador text-right',
    celda: (campana) => celdaNumero(campana.perrosMachos),
  },
  {
    id: 'perros-hembras',
    encabezado: encabezadoContador(textosAdmin.campanas.columnas.perrosHembras),
    className: 'w-col-contador text-right',
    celda: (campana) => celdaNumero(campana.perrosHembras),
  },
  {
    id: 'gatos-machos',
    encabezado: encabezadoContador(textosAdmin.campanas.columnas.gatosMachos),
    className: 'w-col-contador text-right',
    celda: (campana) => celdaNumero(campana.gatosMachos),
  },
  {
    id: 'gatos-hembras',
    encabezado: encabezadoContador(textosAdmin.campanas.columnas.gatosHembras),
    className: 'w-col-contador text-right',
    celda: (campana) => celdaNumero(campana.gatosHembras),
  },
  {
    id: 'total',
    encabezado: <span className="block text-right">{textosAdmin.campanas.columnas.total}</span>,
    className: 'w-col-total-admin text-right',
    celda: (campana) => (
      <span className="t-total block text-right text-negro">
        {formatNumber(campana.totales.total, 'es')}
      </span>
    ),
  },
];

function FilaAcumulada({ contadores }: { contadores: ContadoresCampana }) {
  const textos = textosAdmin.campanas;
  const total = totalesDe(contadores).total;
  return (
    <div role="row" className="flex h-fila-admin items-center px-3">
      <div role="cell" className="t-body-strong min-w-col-campana flex-1 text-negro">
        {textos.totalAcumulado}
      </div>
      <div role="cell" className="w-col-fecha-admin shrink-0" />
      <div role="cell" className="t-fila w-col-contador shrink-0 text-right text-negro">
        {formatNumber(contadores.perrosMachos, 'es')}
      </div>
      <div role="cell" className="t-fila w-col-contador shrink-0 text-right text-negro">
        {formatNumber(contadores.perrosHembras, 'es')}
      </div>
      <div role="cell" className="t-fila w-col-contador shrink-0 text-right text-negro">
        {formatNumber(contadores.gatosMachos, 'es')}
      </div>
      <div role="cell" className="t-fila w-col-contador shrink-0 text-right text-negro">
        {formatNumber(contadores.gatosHembras, 'es')}
      </div>
      <div role="cell" className="t-total w-col-total-admin shrink-0 text-right text-negro">
        {formatNumber(total, 'es')}
      </div>
    </div>
  );
}

function GaleriaCampana({
  fotos,
  activa,
  onElegir,
  onAgregar,
  deshabilitado,
}: {
  fotos: string[];
  activa: number;
  onElegir: (indice: number) => void;
  onAgregar: () => void;
  deshabilitado: boolean;
}) {
  const principal = fotos[activa];
  const visible = principal ? fuenteVisible(principal) : null;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex h-foto-campana items-center justify-center overflow-hidden rounded-btn bg-crema-tono">
        {visible ? (
          <img src={visible} alt={textosAdmin.campanas.foto} className="size-full object-cover" />
        ) : (
          <p className="t-small text-negro">{textosAdmin.campanas.foto}</p>
        )}
      </div>
      <div className="flex w-full gap-2">
        {fotos.length === 0
          ? [0, 1, 2].map((indice) => (
              <span
                key={indice}
                className="h-miniatura-campana min-w-0 flex-1 rounded-btn bg-crema-tono"
              />
            ))
          : fotos.map((foto, indice) => {
              const src = fuenteVisible(foto);
              return (
                <button
                  key={`${foto}-${indice}`}
                  type="button"
                  aria-pressed={indice === activa}
                  aria-label={textosAdmin.campanas.foto}
                  onClick={() => onElegir(indice)}
                  className="h-miniatura-campana min-w-0 flex-1 overflow-hidden rounded-btn bg-crema-tono"
                >
                  {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
                </button>
              );
            })}
        <button
          type="button"
          disabled={deshabilitado}
          onClick={onAgregar}
          aria-label={textosAdmin.nuevaCampana.agregarFotos}
          className="flex h-miniatura-campana min-w-0 flex-1 cursor-pointer items-center justify-center rounded-btn border border-dashed border-linea bg-crema-tono t-small text-negro disabled:cursor-not-allowed disabled:opacity-50"
        >
          {textosAdmin.campanas.agregarFoto}
        </button>
      </div>
    </div>
  );
}

function elegirId(lista: CampanaConTotales[], actual: string | null, preferido?: string) {
  if (preferido && lista.some((campana) => campana.id === preferido)) return preferido;
  if (actual && lista.some((campana) => campana.id === actual)) return actual;
  return lista[1]?.id ?? lista[0]?.id ?? null;
}

export function AdminCampanasPage() {
  const textos = textosAdmin.campanas;
  const [carga, setCarga] = useState<Carga>('cargando');
  const [intento, setIntento] = useState(0);
  const [campanas, setCampanas] = useState<CampanaConTotales[]>([]);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [modal, setModal] = useState<CampanaConTotales | null | 'crear'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fotoPendiente, setFotoPendiente] = useState<FotoPendiente | null>(null);
  const [reintentandoFoto, setReintentandoFoto] = useState(false);

  useEffect(() => {
    let vivo = true;
    listCampanas()
      .then((lista) => {
        if (!vivo) return;
        setCampanas(lista);
        setSeleccionId((actual) => elegirId(lista, actual));
        setFotoActiva(0);
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

  function seleccionar(id: string) {
    setSeleccionId(id);
    setFotoActiva(0);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const seleccionada = campanas.find((campana) => campana.id === seleccionId) ?? null;
  const totales = acumuladoDe(campanas);

  function abrirEdicion() {
    if (!seleccionada?.editable) return;
    setModal(seleccionada);
  }

  async function recargar(preferido?: string) {
    const lista = await listCampanas();
    setCampanas(lista);
    setSeleccionId((actual) => elegirId(lista, actual, preferido));
    setFotoActiva(0);
    setCarga('listo');
  }

  async function reintentarFoto() {
    if (!fotoPendiente || reintentandoFoto) return;
    setReintentandoFoto(true);
    try {
      await subirFotosCampana(fotoPendiente.id, fotoPendiente.archivos);
      const id = fotoPendiente.id;
      setFotoPendiente(null);
      await recargar(id);
      setToast(textosAdmin.supuestos.guardado);
    } catch {
      /* El aviso sigue visible para volver a intentar la subida. */
    } finally {
      setReintentandoFoto(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-(--spacing-bloque-gap-admin)">
      <header className="flex flex-col gap-(--spacing-titulo-pagina-admin)">
        <h1 className="t-pagina text-negro">{textos.titulo}</h1>
        <p className="t-subtitulo text-negro">{textos.subtitulo}</p>
      </header>

      {fotoPendiente ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="t-small text-negro">{textosAdmin.supuestos.fotoNoSubio}</p>
          <BotonPildora
            variante="ghost"
            disabled={reintentandoFoto}
            aria-busy={reintentandoFoto}
            onClick={() => void reintentarFoto()}
          >
            {textosAdmin.supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : null}

      {carga === 'cargando' ? (
        <Card radius="admin" elevated="panel" className="flex min-h-(--size-panel-vacio-admin)" aria-busy="true">
          <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
          <div className="flex flex-1 flex-col gap-3 px-3 py-4">
            <div className="h-(--size-control-admin) animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
          </div>
          <div className="w-panel-detalle shrink-0 border-l border-linea p-7">
            <div className="h-foto-campana animate-pulse rounded-btn bg-crema-tono" />
          </div>
        </Card>
      ) : null}

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

      {carga === 'listo' ? (
        <Card radius="admin" elevated="panel" className="flex items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 py-4">
            <div className="flex h-(--size-control-admin) items-center justify-between gap-4 px-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="t-barra text-negro">{textos.todas}</h2>
                <p className="t-small text-negro">
                  {formatNumber(campanas.length, 'es')} {textos.jornadas}
                </p>
              </div>
              <BotonPildora onClick={() => setModal('crear')}>{textos.nueva}</BotonPildora>
            </div>
            {campanas.length === 0 ? (
              <p className="px-3 py-4 t-small text-negro">{textosAdmin.supuestos.vacio}</p>
            ) : (
              <TablaSeleccion
                etiqueta={textos.todas}
                columnas={COLUMNAS}
                filas={campanas}
                seleccionId={seleccionId}
                onSeleccionar={seleccionar}
                pie={<FilaAcumulada contadores={totales} />}
              />
            )}
            <p className="t-small mt-auto px-3 text-negro">
              {textos.mostrando.replace(
                '4 de 4',
                `${formatNumber(campanas.length, 'es')} de ${formatNumber(campanas.length, 'es')}`,
              )}
            </p>
          </div>
          {seleccionada ? (
            <PanelDetalle
              fotos={[]}
              antes={
                <GaleriaCampana
                  fotos={seleccionada.fotos}
                  activa={fotoActiva}
                  onElegir={setFotoActiva}
                  onAgregar={abrirEdicion}
                  deshabilitado={!seleccionada.editable}
                />
              }
              titulo={seleccionada.titulo}
              subtitulo={[seleccionada.lugar, fechaCorta(seleccionada.fecha)].filter(Boolean).join(' · ')}
              accion={
                <div className="flex flex-col items-center gap-2">
                  <BotonPildora
                    variante="ghost"
                    disabled={!seleccionada.editable}
                    onClick={abrirEdicion}
                  >
                    {textos.editarJornada}
                  </BotonPildora>
                  {seleccionada.editable ? null : (
                    <p className="t-small text-center text-negro">{textosAdmin.supuestos.campanaCerrada}</p>
                  )}
                </div>
              }
              filas={[
                {
                  id: 'total',
                  icono: <Hash className={icono} aria-hidden="true" />,
                  etiqueta: textos.totalJornada,
                  valor: formatNumber(seleccionada.totales.total, 'es'),
                  valorClassName: 't-total-detalle',
                },
                {
                  id: 'perros-machos',
                  icono: <PawPrint className={icono} aria-hidden="true" />,
                  etiqueta: textos.columnas.perrosMachos,
                  valor: formatNumber(seleccionada.perrosMachos, 'es'),
                },
                {
                  id: 'perros-hembras',
                  icono: <PawPrint className={icono} aria-hidden="true" />,
                  etiqueta: textos.columnas.perrosHembras,
                  valor: formatNumber(seleccionada.perrosHembras, 'es'),
                },
                {
                  id: 'gatos-machos',
                  icono: <Cat className={icono} aria-hidden="true" />,
                  etiqueta: textos.columnas.gatosMachos,
                  valor: formatNumber(seleccionada.gatosMachos, 'es'),
                },
                {
                  id: 'gatos-hembras',
                  icono: <Cat className={icono} aria-hidden="true" />,
                  etiqueta: textos.columnas.gatosHembras,
                  valor: formatNumber(seleccionada.gatosHembras, 'es'),
                },
              ]}
            />
          ) : null}
        </Card>
      ) : null}

      {toast ? (
        <p
          role="status"
          className="t-nav fixed bottom-6 left-1/2 -translate-x-1/2 rounded-pill bg-negro px-5 py-3 text-crema"
        >
          {toast}
        </p>
      ) : null}

      {modal ? (
        <CampanaFormModal
          key={modal === 'crear' ? 'crear' : modal.id}
          campana={modal === 'crear' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardada={(id, fotosFallidas) => {
            setModal(null);
            setFotoPendiente(fotosFallidas ? { id, archivos: fotosFallidas } : null);
            setToast(fotosFallidas ? null : textosAdmin.supuestos.guardado);
            setIntento((valor) => valor + 1);
            setSeleccionId(id);
          }}
        />
      ) : null}
    </div>
  );
}
