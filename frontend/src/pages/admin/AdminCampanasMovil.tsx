import { useEffect, useId, useState } from 'react';
import { Calendar, Cat, ChevronDown, ChevronUp, Ellipsis, PawPrint, Plus, Search, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import type { PeriodoCampanas } from '@/services/admin/cifras-campanas';
import type { CampanaConTotales, PaginaCampanas } from '@/types/admin';
import { totalesDe } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { SelectFiltro } from '@/components/admin/ui/SelectFiltro';
import { cn } from '@/lib/cn';

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
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

type AdminCampanasMovilProps = {
  datos: PaginaCampanas;
  periodo: PeriodoCampanas;
  onPeriodo: (periodo: PeriodoCampanas) => void;
  onCrear: () => void;
  onEditar: (campana: CampanaConTotales) => void;
  onCargarMas: () => void;
  cargandoMas: boolean;
};

export function AdminCampanasMovil({
  datos,
  periodo,
  onPeriodo,
  onCrear,
  onEditar,
  onCargarMas,
  cargandoMas,
}: AdminCampanasMovilProps) {
  const textos = textosAdmin.campanas;
  const menuId = useId();
  const [busqueda, setBusqueda] = useState('');
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fabCompacto, setFabCompacto] = useState(false);
  const consulta = busqueda.trim();
  const hayFiltro = periodo.anio !== null || periodo.mes !== null;
  const visibles = datos.items.filter((campana) => {
    if (!consulta) return true;
    const texto = `${campana.titulo} ${campana.lugar ?? ''}`.toLocaleLowerCase('es');
    return texto.includes(consulta.toLocaleLowerCase('es'));
  });
  const totales = totalesDe(datos.contadores);
  const hayMas = datos.pagina < datos.totalPaginas;
  const periodoTexto = [periodo.mes ? textos.filtros.meses[periodo.mes - 1] : null, periodo.anio]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    function alScroll() {
      setFabCompacto(window.scrollY > 8);
    }
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  useEffect(() => {
    if (!menuAbierto) return;
    function cerrar(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuAbierto(false);
    }
    document.addEventListener('keydown', cerrar);
    return () => document.removeEventListener('keydown', cerrar);
  }, [menuAbierto]);

  return (
    <div className="flex flex-col gap-(--spacing-bloque-movil) pb-(--spacing-libre-fab)">
      <label className="border-negro bg-blanco flex h-(--size-control-admin) items-center gap-2.5 rounded-card border pr-3 pl-4">
        <Search className="size-5 shrink-0" aria-hidden="true" />
        <span className="sr-only">{textos.buscar}</span>
        <input
          value={busqueda}
          placeholder={textos.buscar}
          onChange={(event) => setBusqueda(event.target.value)}
          className="t-control text-negro placeholder:text-placeholder min-w-0 flex-1 bg-transparent outline-none"
        />
        {busqueda ? (
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center"
            aria-label={textos.borrarBusqueda}
            onClick={() => setBusqueda('')}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </label>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SelectFiltro
            id="filtro-anio-campanas-movil"
            movil
            etiqueta={textos.filtros.anio}
            valor={periodo.anio === null ? null : String(periodo.anio)}
            textoValor={periodo.anio === null ? null : String(periodo.anio)}
            todosEtiqueta={textos.filtros.todosLosAnios}
            opciones={datos.anios.map((anio) => ({ valor: String(anio), etiqueta: String(anio) }))}
            disposicion="lista"
            onCambio={(valor) => onPeriodo({ ...periodo, anio: valor === null ? null : Number(valor) })}
          />
          <SelectFiltro
            id="filtro-mes-campanas-movil"
            movil
            etiqueta={textos.filtros.mes}
            valor={periodo.mes === null ? null : String(periodo.mes)}
            textoValor={periodo.mes === null ? null : (textosAdmin.resumen.meses[periodo.mes - 1] ?? null)}
            todosEtiqueta={textos.filtros.todosLosMeses}
            opciones={textosAdmin.resumen.meses.map((nombre, indice) => ({
              valor: String(indice + 1),
              etiqueta: nombre,
              atenuada: !datos.meses.includes(indice + 1),
            }))}
            disposicion="cuadricula"
            onCambio={(valor) => onPeriodo({ ...periodo, mes: valor === null ? null : Number(valor) })}
          />
          {hayFiltro ? (
            <button
              type="button"
              className="t-chip text-negro inline-flex min-h-11 items-center gap-1.5 px-1.5"
              onClick={() => onPeriodo({ anio: null, mes: null })}
            >
              {textos.filtros.limpiarCorto}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            className="border-negro bg-blanco flex size-11 items-center justify-center rounded-pill border"
            aria-expanded={menuAbierto}
            aria-controls={menuId}
            aria-label={textos.acciones}
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            <Ellipsis className="size-5" aria-hidden="true" />
          </button>
          {menuAbierto ? (
            <div
              id={menuId}
              role="menu"
              className="border-negro bg-blanco shadow-menu-admin absolute top-full right-0 z-30 mt-2 w-(--spacing-menu-avatar) rounded-admin border p-2"
            >
              {[textos.importar, textos.exportar].map((accion) => (
                <button
                  key={accion}
                  type="button"
                  role="menuitem"
                  disabled
                  className="flex w-full flex-col items-start rounded-btn px-3 py-2 text-left opacity-50"
                >
                  <span className="t-nav text-negro">{accion}</span>
                  <span className="t-nota text-negro">{textos.proximamente}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={cn('flex flex-col', resumenAbierto && 'bg-crema-tono rounded-admin p-4')}>
        <button
          type="button"
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
          aria-expanded={resumenAbierto}
          onClick={() => setResumenAbierto((abierto) => !abierto)}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className={cn('shrink-0', resumenAbierto ? 't-detalle text-naranja' : 't-marca text-negro')}>
              {formatNumber(totales.total, 'es')}
            </span>
            <span className="t-control text-negro">{textos.resumenLinea(datos.total)}</span>
          </span>
          {resumenAbierto ? (
            <ChevronUp className="size-5 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-5 shrink-0" aria-hidden="true" />
          )}
        </button>
        {resumenAbierto ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                [textos.columnas.perrosMachos, datos.contadores.perrosMachos],
                [textos.columnas.perrosHembras, datos.contadores.perrosHembras],
                [textos.columnas.gatosMachos, datos.contadores.gatosMachos],
                [textos.columnas.gatosHembras, datos.contadores.gatosHembras],
              ] as const
            ).map(([etiqueta, valor]) => (
              <div key={etiqueta} className="bg-blanco flex flex-col gap-1 rounded-card p-3.5">
                <p className="t-nota text-negro">{etiqueta}</p>
                <p className="t-detalle text-negro">{formatNumber(valor, 'es')}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {datos.total === 0 && !consulta ? (
        <div className="border-linea flex flex-col items-center gap-4 rounded-admin border px-6 py-10 text-center">
          <Calendar className="size-8" aria-hidden="true" />
          <p className="t-control text-negro">{textos.vacioTitulo}</p>
          <BotonPildora onClick={onCrear}>{textos.nuevaCorta}</BotonPildora>
        </div>
      ) : null}

      {datos.total > 0 && visibles.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="t-control text-negro">
            {consulta ? textos.sinResultados(consulta) : textos.sinResultados(periodoTexto)}
          </p>
          <BotonPildora
            variante="ghost"
            onClick={() => {
              setBusqueda('');
              onPeriodo({ anio: null, mes: null });
            }}
          >
            {textos.filtros.limpiar}
          </BotonPildora>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {visibles.map((campana) => {
          const abierta = expandidaId === campana.id;
          const lugarFecha = [campana.lugar, fechaCorta(campana.fecha)].filter(Boolean).join(' · ');
          return (
            <li
              key={campana.id}
              className="border-negro bg-blanco shadow-tarjeta-movil rounded-admin border p-4"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                aria-expanded={abierta}
                onClick={() => setExpandidaId(abierta ? null : campana.id)}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="t-barra text-negro truncate">{campana.titulo}</span>
                  {lugarFecha ? <span className="t-nota text-negro truncate">{lugarFecha}</span> : null}
                </span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="t-foto text-negro">{textos.totalEtiqueta}</span>
                  <span className="t-total-tarjeta text-naranja">
                    {formatNumber(campana.totales.total, 'es')}
                  </span>
                </span>
                {abierta ? (
                  <ChevronUp className="size-5 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="size-5 shrink-0" aria-hidden="true" />
                )}
              </button>
              {abierta ? (
                <div className="border-linea mt-4 flex flex-col gap-4 border-t pt-4">
                  <div className="flex gap-2">
                    {campana.fotos.length === 0
                      ? [0, 1, 2].map((indice) => (
                          <span
                            key={indice}
                            className="bg-crema-tono size-(--spacing-mini-movil) shrink-0 rounded-btn"
                          />
                        ))
                      : campana.fotos.map((foto, indice) => {
                          const src = fuenteVisible(foto);
                          return (
                            <span
                              key={`${foto}-${indice}`}
                              className="bg-crema-tono size-(--spacing-mini-movil) shrink-0 overflow-hidden rounded-btn"
                            >
                              {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
                            </span>
                          );
                        })}
                    <button
                      type="button"
                      className="border-linea bg-crema-tono t-detalle flex size-(--spacing-mini-movil) shrink-0 items-center justify-center rounded-btn border border-dashed"
                      disabled={!campana.editable}
                      aria-label={textosAdmin.nuevaCampana.agregarFotos}
                      onClick={() => onEditar(campana)}
                    >
                      +
                    </button>
                  </div>
                  <dl>
                    {(
                      [
                        [textos.columnas.perrosMachos, campana.perrosMachos, 'perro'],
                        [textos.columnas.perrosHembras, campana.perrosHembras, 'perro'],
                        [textos.columnas.gatosMachos, campana.gatosMachos, 'gato'],
                        [textos.columnas.gatosHembras, campana.gatosHembras, 'gato'],
                      ] as const
                    ).map(([etiqueta, valor, especie]) => (
                      <div
                        key={etiqueta}
                        className="border-linea flex h-dato-admin items-center justify-between border-b"
                      >
                        <dt className="t-nav text-negro flex items-center gap-2.5">
                          {especie === 'perro' ? (
                            <PawPrint className="size-4" aria-hidden="true" />
                          ) : (
                            <Cat className="size-4" aria-hidden="true" />
                          )}
                          {etiqueta}
                        </dt>
                        <dd className="t-nav text-negro">{formatNumber(valor, 'es')}</dd>
                      </div>
                    ))}
                  </dl>
                  <BotonPildora
                    variante="ghost"
                    className="w-full"
                    disabled={!campana.editable}
                    onClick={() => onEditar(campana)}
                  >
                    {textos.editarJornada}
                  </BotonPildora>
                  {!campana.editable ? (
                    <p className="t-small text-negro text-center">{textosAdmin.supuestos.campanaCerrada}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {datos.total > 0 ? (
        <p className="t-nota text-negro text-center">
          {consulta
            ? textos.mostrandoDe(visibles.length, datos.items.length)
            : textos.mostrandoDe(datos.items.length, datos.total)}
          {periodoTexto ? ` · ${periodoTexto}` : ''}
        </p>
      ) : null}

      {hayMas && !consulta ? (
        <BotonPildora variante="ghost" className="w-full" disabled={cargandoMas} onClick={onCargarMas}>
          {textos.cargarMas}
        </BotonPildora>
      ) : null}

      <button
        type="button"
        className={cn(
          'bg-naranja text-blanco shadow-fab-admin fixed z-30 flex items-center justify-center rounded-pill',
          'right-(--spacing-nav-movil-x) bottom-[calc(var(--spacing-fab-sobre-barra)+max(var(--spacing-barra-inferior-pb),env(safe-area-inset-bottom,0px)))]',
          fabCompacto ? 'size-14' : 'h-14 gap-2 pr-5 pl-4',
        )}
        onClick={onCrear}
      >
        <Plus className="size-5 shrink-0" aria-hidden="true" />
        {fabCompacto ? <span className="sr-only">{textos.nuevaCorta}</span> : <span className="t-nav">{textos.nuevaCorta}</span>}
      </button>
    </div>
  );
}
