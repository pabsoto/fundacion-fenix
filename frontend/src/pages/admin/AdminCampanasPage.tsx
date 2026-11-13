import { useEffect, useRef, useState } from 'react';
import { useVistaMovil } from '@/hooks/useVistaMovil';
import { AdminCampanasMovil } from '@/pages/admin/AdminCampanasMovil';
import { Cat, Eye, Hash, PawPrint, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { listCampanas, subirFotosCampana } from '@/services/admin/campanas.service';
import type { PeriodoCampanas } from '@/services/admin/cifras-campanas';
import type { CampanaConTotales, ContadoresCampana, PaginaCampanas } from '@/types/admin';
import { TAMANO_PAGINA_ADMIN, totalesDe } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { MarcaEstado } from '@/components/admin/ui/MarcaEstado';
import { Paginacion } from '@/components/admin/ui/Paginacion';
import { SelectFiltro } from '@/components/admin/ui/SelectFiltro';
import { PanelDetalle } from '@/components/admin/ui/PanelDetalle';
import { TablaSeleccion, type ColumnaTabla } from '@/components/admin/ui/TablaSeleccion';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { CampanaFormModal } from '@/pages/admin/CampanaFormModal';
import { CierreCampanaModal, type AccionCierre } from '@/pages/admin/CierreCampanaModal';

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

function fechaCorta(iso: string | null): string {
  if (!iso) return '';
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

const PERIODO_TODOS: PeriodoCampanas = { anio: null, mes: null };

function textoMostrando(datos: PaginaCampanas) {
  const desde = (datos.pagina - 1) * datos.limite + 1;
  const hasta = desde + datos.items.length - 1;
  return textosAdmin.campanas.mostrandoRango(desde, hasta, datos.total);
}

function nombrePeriodo(periodo: PeriodoCampanas, mesEnMayuscula: boolean): string {
  const partes: string[] = [];
  if (periodo.mes) {
    const nombre = textosAdmin.campanas.filtros.meses[periodo.mes - 1] ?? '';
    partes.push(mesEnMayuscula ? nombre : nombre.toLocaleLowerCase('es'));
  }
  if (periodo.anio) partes.push(String(periodo.anio));
  return partes.join(' ');
}

const COLUMNAS: ColumnaTabla<CampanaConTotales>[] = [
  {
    id: 'campana',
    encabezado: textosAdmin.campanas.columnas.campana,
    crece: true,
    className: 'min-w-col-campana',
    celda: (campana) => {
      const detalle = [
        campana.estado === 'borrador' ? textosAdmin.campanas.estados.borrador : null,
        campana.lugar,
      ]
        .filter(Boolean)
        .join(' · ');
      return (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="t-fila truncate text-negro">{campana.titulo}</span>
          {detalle ? <span className="t-small truncate text-negro">{detalle}</span> : null}
        </span>
      );
    },
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

function FilaAcumulada({
  titulo,
  contadores,
}: {
  titulo: string;
  contadores: ContadoresCampana;
}) {
  const total = totalesDe(contadores).total;
  return (
    <div role="row" className="flex h-fila-admin items-center px-3">
      <div role="cell" className="t-body-strong min-w-col-campana flex-1 text-negro">
        {titulo}
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
  const movil = useVistaMovil();
  const [carga, setCarga] = useState<Carga>('cargando');
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState<PaginaCampanas | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cambiando, setCambiando] = useState(false);
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [fotoActiva, setFotoActiva] = useState(0);
  const [modal, setModal] = useState<CampanaConTotales | null | 'crear'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cierre, setCierre] = useState<{ campana: CampanaConTotales; accion: AccionCierre } | null>(null);
  const [fotoPendiente, setFotoPendiente] = useState<FotoPendiente | null>(null);
  const [reintentandoFoto, setReintentandoFoto] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoCampanas>(PERIODO_TODOS);
  /** Campaña que se debe seleccionar al terminar la próxima carga (la recién guardada). */
  const preferidoRef = useRef<string | undefined>(undefined);

  // El backend filtra por periodo, pagina y suma las cifras del filtro completo.
  useEffect(() => {
    let vivo = true;
    listCampanas({
      pagina,
      limite: TAMANO_PAGINA_ADMIN,
      anio: periodo.anio ?? undefined,
      mes: periodo.mes ?? undefined,
    })
      .then((respuesta) => {
        if (!vivo) return;
        // Tras eliminar la última campaña de una página, se retrocede a una que exista.
        if (respuesta.items.length === 0 && pagina > 1 && !movil) {
          setPagina(Math.max(1, respuesta.totalPaginas));
          return;
        }
        setDatos((actual) => {
          if (!movil || pagina === 1 || !actual) return respuesta;
          const ids = new Set(actual.items.map((campana) => campana.id));
          return {
            ...respuesta,
            items: [...actual.items, ...respuesta.items.filter((campana) => !ids.has(campana.id))],
          };
        });
        setSeleccionId((actual) => elegirId(respuesta.items, actual, preferidoRef.current));
        preferidoRef.current = undefined;
        setFotoActiva(0);
        setCarga('listo');
        setCambiando(false);
      })
      .catch(() => {
        if (!vivo) return;
        setCarga('error');
        setCambiando(false);
      });
    return () => {
      vivo = false;
    };
  }, [intento, pagina, periodo.anio, periodo.mes, movil]);

  function seleccionar(id: string) {
    setSeleccionId(id);
    setFotoActiva(0);
  }

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibles = datos?.items ?? [];
  const anios = datos?.anios ?? [];
  const seleccionada = visibles.find((campana) => campana.id === seleccionId) ?? null;
  const hayFiltro = periodo.anio !== null || periodo.mes !== null;

  function abrirEdicion() {
    if (!seleccionada?.editable) return;
    setModal(seleccionada);
  }

  function fijarPeriodo(siguiente: PeriodoCampanas) {
    setCambiando(true);
    setPagina(1);
    setPeriodo(siguiente);
  }

  function irAPagina(siguiente: number) {
    setCambiando(true);
    setPagina(siguiente);
  }

  /** Vuelve a pedir la página actual. `preferido` queda seleccionada si sigue en ella. */
  function recargar(preferido?: string) {
    preferidoRef.current = preferido;
    setIntento((valor) => valor + 1);
  }

  async function reintentarFoto() {
    if (!fotoPendiente || reintentandoFoto) return;
    setReintentandoFoto(true);
    try {
      await subirFotosCampana(fotoPendiente.id, fotoPendiente.archivos);
      const id = fotoPendiente.id;
      setFotoPendiente(null);
      recargar(id);
      setToast(textosAdmin.supuestos.guardado);
    } catch {
      /* El aviso sigue visible para volver a intentar la subida. */
    } finally {
      setReintentandoFoto(false);
    }
  }

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

      {carga === 'cargando' && movil ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
          <div className="h-(--size-control-admin) animate-pulse rounded-card bg-crema-tono" />
          <div className="h-24 animate-pulse rounded-admin bg-crema-tono" />
          <div className="h-24 animate-pulse rounded-admin bg-crema-tono" />
        </div>
      ) : null}

      {carga === 'cargando' && !movil ? (
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

      {carga === 'listo' && datos && movil ? (
        <AdminCampanasMovil
          datos={datos}
          periodo={periodo}
          onPeriodo={fijarPeriodo}
          onCrear={() => setModal('crear')}
          onEditar={(campana) => {
            if (!campana.editable) return;
            setModal(campana);
          }}
          onCargarMas={() => irAPagina(pagina + 1)}
          cargandoMas={cambiando}
        />
      ) : null}

      {carga === 'listo' && datos && !movil ? (
        <Card radius="admin" elevated="panel" className="flex items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 py-4">
            <div className="flex h-(--size-control-admin) items-center justify-between gap-4 px-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="t-barra text-negro">{textos.todas}</h2>
                <p className="t-small text-negro">
                  {formatNumber(datos.total, 'es')} {textos.jornadas}
                </p>
              </div>
              <BotonPildora onClick={() => setModal('crear')}>{textos.nueva}</BotonPildora>
            </div>
            <div className="flex h-(--size-control-admin) items-center justify-between gap-4 rounded-btn bg-crema-tono px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <p className="t-small shrink-0 text-texto-secundario">{textos.filtros.filtrar}</p>
                <SelectFiltro
                  id="filtro-anio-campanas"
                  etiqueta={textos.filtros.anio}
                  valor={periodo.anio === null ? null : String(periodo.anio)}
                  textoValor={periodo.anio === null ? null : String(periodo.anio)}
                  todosEtiqueta={textos.filtros.todosLosAnios}
                  opciones={anios.map((anio) => ({ valor: String(anio), etiqueta: String(anio) }))}
                  disposicion="lista"
                  onCambio={(valor) =>
                    fijarPeriodo({ ...periodo, anio: valor === null ? null : Number(valor) })
                  }
                />
                <SelectFiltro
                  id="filtro-mes-campanas"
                  etiqueta={textos.filtros.mes}
                  valor={periodo.mes === null ? null : String(periodo.mes)}
                  textoValor={
                    periodo.mes === null ? null : (textos.filtros.meses[periodo.mes - 1] ?? null)
                  }
                  todosEtiqueta={textos.filtros.todosLosMeses}
                  opciones={textosAdmin.resumen.meses.map((nombre, indice) => ({
                    valor: String(indice + 1),
                    etiqueta: nombre,
                    atenuada: !datos.meses.includes(indice + 1),
                  }))}
                  disposicion="cuadricula"
                  onCambio={(valor) =>
                    fijarPeriodo({ ...periodo, mes: valor === null ? null : Number(valor) })
                  }
                />
              </div>
              {hayFiltro ? (
                <button
                  type="button"
                  onClick={() => fijarPeriodo(PERIODO_TODOS)}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 px-2 py-1.5 t-chip text-negro"
                >
                  {textos.filtros.limpiar}
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {/* Las columnas tienen ancho fijo: si no caben, la tabla se desplaza sola y no invade el panel. */}
            <div className="min-w-0 overflow-x-auto">
              <div className="min-w-max">
            <TablaSeleccion
              etiqueta={textos.todas}
              columnas={COLUMNAS}
              filas={visibles}
              seleccionId={seleccionId}
              onSeleccionar={seleccionar}
              pie={
                <FilaAcumulada
                  titulo={
                    hayFiltro
                      ? textos.filtros.totalDe(nombrePeriodo(periodo, false))
                      : textos.totalAcumulado
                  }
                  contadores={datos.contadores}
                />
              }
            />
              </div>
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-3">
              <p className="t-small text-negro">
                {hayFiltro
                  ? `${textoMostrando(datos)} · ${nombrePeriodo(periodo, true)}`
                  : textoMostrando(datos)}
              </p>
              <Paginacion
                pagina={datos.pagina}
                totalPaginas={datos.totalPaginas}
                onCambiar={irAPagina}
                deshabilitado={cambiando}
              />
            </div>
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
                  {seleccionada.estado === 'publicada' ? (
                    <BotonPildora onClick={() => setCierre({ campana: seleccionada, accion: 'cerrar' })}>
                      {textos.cerrarCampana}
                    </BotonPildora>
                  ) : null}
                  {seleccionada.estado === 'cerrada' ? (
                    <>
                      <p className="t-small text-center text-negro">{textosAdmin.supuestos.campanaCerrada}</p>
                      <BotonPildora
                        variante="ghost"
                        onClick={() => setCierre({ campana: seleccionada, accion: 'reabrir' })}
                      >
                        {textos.reabrirCampana}
                      </BotonPildora>
                    </>
                  ) : null}
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
                {
                  id: 'estado',
                  icono: <Eye className={icono} aria-hidden="true" />,
                  etiqueta: textos.estado,
                  valor: (
                    <MarcaEstado activo={seleccionada.estado === 'publicada'}>
                      {textos.estados[seleccionada.estado]}
                    </MarcaEstado>
                  ),
                },
              ]}
            />
          ) : (
            <aside className="flex w-panel-detalle shrink-0 items-center justify-center border-l border-linea p-7">
              <p className="t-small text-center text-texto-secundario">{textos.filtros.selecciona}</p>
            </aside>
          )}
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

      {cierre ? (
        <CierreCampanaModal
          campana={cierre.campana}
          accion={cierre.accion}
          onCerrar={() => setCierre(null)}
          onHecho={(id) => {
            setToast(cierre.accion === 'cerrar' ? textos.cierre.cerrada : textos.cierre.reabierta);
            setCierre(null);
            recargar(id);
          }}
        />
      ) : null}

      {modal ? (
        <CampanaFormModal
          key={modal === 'crear' ? 'crear' : modal.id}
          pantallaCompleta={movil}
          campana={modal === 'crear' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardada={(id, fotosFallidas) => {
            const eraNueva = modal === 'crear';
            setModal(null);
            setFotoPendiente(fotosFallidas ? { id, archivos: fotosFallidas } : null);
            setToast(fotosFallidas ? null : textosAdmin.supuestos.guardado);
            // Una campaña nueva puede quedar en cualquier página: se vuelve a la primera.
            if (eraNueva) setPagina(1);
            recargar(id);
          }}
          onEliminada={() => {
            setModal(null);
            setFotoPendiente(null);
            setToast(textos.eliminar.eliminada);
            setSeleccionId(null);
            recargar();
          }}
        />
      ) : null}
    </div>
  );
}
