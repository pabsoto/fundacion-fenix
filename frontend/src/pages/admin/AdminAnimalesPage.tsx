import { useEffect, useRef, useState } from 'react';
import { Calendar, Cat, Heart, MapPin, Mars, PawPrint, User, Venus } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import {
  listAnimales,
  quitarFotoAnimal,
  subirFotoAnimal,
} from '@/services/admin/animales.service';
import {
  estaAdoptado,
  TAMANO_PAGINA_ADMIN,
  type Animal,
  type Especie,
  type FiltroAnimales,
  type Pagina,
  type Sexo,
} from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { ChipFiltro } from '@/components/admin/ui/ChipFiltro';
import { MarcaEstado } from '@/components/admin/ui/MarcaEstado';
import { Paginacion } from '@/components/admin/ui/Paginacion';
import { PanelDetalle, type FilaDetalle } from '@/components/admin/ui/PanelDetalle';
import { TablaSeleccion, type ColumnaTabla } from '@/components/admin/ui/TablaSeleccion';
import { Card } from '@/components/ui/Card';
import { AnimalFormModal, type FotosPendientes } from '@/pages/admin/AnimalFormModal';

type Carga = 'cargando' | 'listo' | 'error';

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

function elegirId(lista: Animal[], actual: string | null, preferido?: string) {
  if (preferido && lista.some((animal) => animal.id === preferido)) return preferido;
  if (actual && lista.some((animal) => animal.id === actual)) return actual;
  return lista[0]?.id ?? null;
}

function textoEspecie(especie: Especie) {
  return especie === 'perro' ? textosAdmin.registrarAnimal.perro : textosAdmin.registrarAnimal.gato;
}

function textoSexo(sexo: Sexo | null) {
  if (sexo === 'macho') return textosAdmin.registrarAnimal.macho;
  if (sexo === 'hembra') return textosAdmin.registrarAnimal.hembra;
  return textosAdmin.animales.sinAdoptante;
}

function textoEdad(edad: Animal['edad']) {
  if (!edad) return textosAdmin.animales.sinAdoptante;
  if (edad.unidad === 'meses') {
    const unidad = edad.valor === 1 ? textosAdmin.animales.mes : textosAdmin.animales.meses;
    return `${edad.valor} ${unidad}`;
  }
  const unidad = edad.valor === 1 ? textosAdmin.animales.ano : textosAdmin.animales.anios;
  return `${edad.valor} ${unidad}`;
}

function fechaCorta(iso: string | null): string {
  if (!iso) return textosAdmin.animales.sinAdoptante;
  const [anio, mes, dia] = iso.split('-').map(Number);
  const nombre = mes ? MESES_CORTOS[mes - 1] : undefined;
  if (!anio || !dia || !nombre) return textosAdmin.animales.sinAdoptante;
  return `${dia} ${nombre} ${anio}`;
}

function textoMostrando(datos: Pagina<Animal>) {
  const desde = (datos.pagina - 1) * datos.limite + 1;
  const hasta = desde + datos.items.length - 1;
  return textosAdmin.animales.mostrandoRango(desde, hasta, datos.total);
}

function fuenteVisible(valor: string | null): string | null {
  if (!valor) return null;
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

function inicialDe(nombre: string): string {
  const letra = Array.from(nombre.trim())[0];
  return letra ? letra.toLocaleUpperCase('es') : '';
}

function CeldaNombre({ nombre }: { nombre: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="flex size-inicial shrink-0 items-center justify-center rounded-full bg-crema-tono t-inicial text-negro">
        {inicialDe(nombre)}
      </span>
      <span className="t-fila-nombre truncate text-negro">{nombre}</span>
    </span>
  );
}

const COLUMNAS: ColumnaTabla<Animal>[] = [
  {
    id: 'nombre',
    encabezado: textosAdmin.animales.columnas.nombre,
    className: 'w-col-nombre',
    celda: (animal) => <CeldaNombre nombre={animal.nombre} />,
  },
  {
    id: 'especie',
    encabezado: textosAdmin.animales.columnas.especie,
    className: 'w-col-corta',
    celda: (animal) => <span className="t-fila text-negro">{textoEspecie(animal.especie)}</span>,
  },
  {
    id: 'sexo',
    encabezado: textosAdmin.animales.columnas.sexo,
    className: 'w-col-corta',
    celda: (animal) => <span className="t-fila text-negro">{textoSexo(animal.sexo)}</span>,
  },
  {
    id: 'edad',
    encabezado: textosAdmin.animales.columnas.edad,
    className: 'w-col-corta',
    celda: (animal) => <span className="t-fila text-negro">{textoEdad(animal.edad)}</span>,
  },
  {
    id: 'estado',
    encabezado: textosAdmin.animales.columnas.estado,
    className: 'w-col-estado',
    celda: (animal) => (
      <MarcaEstado activo={estaAdoptado(animal)}>
        {estaAdoptado(animal) ? textosAdmin.estado.adoptado : textosAdmin.estado.enLaFundacion}
      </MarcaEstado>
    ),
  },
  {
    id: 'adoptado',
    encabezado: textosAdmin.animales.columnas.adoptadoPor,
    className: 'w-col-adoptante',
    celda: (animal) => (
      <span className="t-fila truncate text-negro">
        {animal.adoptadoPor ?? textosAdmin.animales.sinAdoptante}
      </span>
    ),
  },
];

function filasDetalle(animal: Animal): FilaDetalle[] {
  const textos = textosAdmin.animales;
  const adoptado = estaAdoptado(animal);
  const filas: FilaDetalle[] = [
    {
      id: 'especie',
      icono:
        animal.especie === 'gato' ? (
          <Cat className={icono} aria-hidden="true" />
        ) : (
          <PawPrint className={icono} aria-hidden="true" />
        ),
      etiqueta: textos.columnas.especie,
      valor: textoEspecie(animal.especie),
    },
    {
      id: 'sexo',
      icono:
        animal.sexo === 'hembra' ? (
          <Venus className={icono} aria-hidden="true" />
        ) : (
          <Mars className={icono} aria-hidden="true" />
        ),
      etiqueta: textos.columnas.sexo,
      valor: textoSexo(animal.sexo),
    },
    {
      id: 'edad',
      icono: <Calendar className={icono} aria-hidden="true" />,
      etiqueta: textos.columnas.edad,
      valor: textoEdad(animal.edad),
    },
    {
      id: 'ingreso',
      icono: <Calendar className={icono} aria-hidden="true" />,
      etiqueta: textos.ingreso,
      valor: fechaCorta(animal.fechaIngreso),
    },
    {
      id: 'estado',
      icono: <Heart className={icono} aria-hidden="true" />,
      etiqueta: textos.columnas.estado,
      valor: (
        <MarcaEstado activo={adoptado}>
          {adoptado ? textosAdmin.estado.adoptado : textosAdmin.estado.enLaFundacion}
        </MarcaEstado>
      ),
    },
  ];

  if (!adoptado) return filas;

  filas.push(
    {
      id: 'adoptante',
      icono: <User className={icono} aria-hidden="true" />,
      etiqueta: textos.columnas.adoptadoPor,
      valor: animal.adoptadoPor ?? textos.sinAdoptante,
      divisor: false,
    },
    {
      id: 'direccion',
      icono: <MapPin className={icono} aria-hidden="true" />,
      etiqueta: textos.direccion,
      valor: animal.direccionAdoptante ?? textos.sinAdoptante,
      divisor: false,
      alto: 'auto',
      valorClassName: 't-nav w-direccion whitespace-normal',
    },
  );
  return filas;
}

function subtituloDe(animal: Animal): string {
  const especie = textoEspecie(animal.especie);
  if (!animal.edad) return especie;
  return `${especie} · ${textoEdad(animal.edad)}`;
}

export function AdminAnimalesPage() {
  const textos = textosAdmin.animales;
  const [carga, setCarga] = useState<Carga>('cargando');
  const [intento, setIntento] = useState(0);
  const [datos, setDatos] = useState<Pagina<Animal> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [cambiando, setCambiando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAnimales>('todos');
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [modal, setModal] = useState<Animal | null | 'crear'>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [fotoPendiente, setFotoPendiente] = useState<(FotosPendientes & { id: string }) | null>(
    null,
  );
  const [reintentandoFoto, setReintentandoFoto] = useState(false);
  /** Animal que se debe seleccionar al terminar la próxima carga (el recién guardado). */
  const preferidoRef = useRef<string | undefined>(undefined);

  // El backend filtra por estado y pagina; las fotos solo se piden de la página visible.
  useEffect(() => {
    let vivo = true;
    listAnimales({ filtro, pagina, limite: TAMANO_PAGINA_ADMIN })
      .then((respuesta) => {
        if (!vivo) return;
        // Tras eliminar el último animal de una página, se retrocede a una que exista.
        if (respuesta.items.length === 0 && pagina > 1) {
          setPagina(Math.max(1, respuesta.totalPaginas));
          return;
        }
        setDatos(respuesta);
        setSeleccionId((actual) => elegirId(respuesta.items, actual, preferidoRef.current));
        preferidoRef.current = undefined;
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
  }, [intento, pagina, filtro]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const visibles = datos?.items ?? [];
  const seleccionado = visibles.find((animal) => animal.id === seleccionId) ?? null;

  function elegirFiltro(siguiente: FiltroAnimales) {
    if (siguiente === filtro) return;
    setCambiando(true);
    setPagina(1);
    setFiltro(siguiente);
  }

  function irAPagina(siguiente: number) {
    setCambiando(true);
    setPagina(siguiente);
  }

  /** Vuelve a pedir la página actual. `preferido` queda seleccionado si sigue en ella. */
  function recargar(preferido?: string) {
    preferidoRef.current = preferido;
    setIntento((valor) => valor + 1);
  }

  async function reintentarFoto() {
    if (!fotoPendiente || reintentandoFoto) return;
    setReintentandoFoto(true);
    const pendiente = { ...fotoPendiente };
    const siguiente: FotosPendientes & { id: string } = {
      id: pendiente.id,
      ingreso: null,
      adopcion: null,
      quitarIngreso: false,
      quitarAdopcion: false,
    };
    if (pendiente.ingreso) {
      try {
        await subirFotoAnimal(pendiente.id, 'animal', pendiente.ingreso);
      } catch {
        siguiente.ingreso = pendiente.ingreso;
      }
    }
    if (pendiente.quitarIngreso) {
      try {
        await quitarFotoAnimal(pendiente.id, 'animal');
      } catch {
        siguiente.quitarIngreso = true;
      }
    }
    if (pendiente.adopcion) {
      try {
        await subirFotoAnimal(pendiente.id, 'entrega', pendiente.adopcion);
      } catch {
        siguiente.adopcion = pendiente.adopcion;
      }
    }
    if (pendiente.quitarAdopcion) {
      try {
        await quitarFotoAnimal(pendiente.id, 'entrega');
      } catch {
        siguiente.quitarAdopcion = true;
      }
    }
    const sigue =
      siguiente.ingreso ||
      siguiente.adopcion ||
      siguiente.quitarIngreso ||
      siguiente.quitarAdopcion;
    if (sigue) {
      setFotoPendiente(siguiente);
    } else {
      setFotoPendiente(null);
      recargar(pendiente.id);
      setToast(textosAdmin.supuestos.guardado);
    }
    setReintentandoFoto(false);
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
        <Card
          radius="admin"
          elevated="panel"
          className="flex min-h-(--size-panel-vacio-admin)"
          aria-busy="true"
        >
          <p className="sr-only">{textosAdmin.supuestos.cargando}</p>
          <div className="flex flex-1 flex-col gap-3 px-3 py-4">
            <div className="h-(--size-control-admin) animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
          </div>
          <div className="w-panel-detalle shrink-0 border-l border-linea p-7">
            <div className="h-foto-detalle animate-pulse rounded-btn bg-crema-tono" />
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

      {carga === 'listo' && datos ? (
        <Card radius="admin" elevated="panel" className="flex items-stretch">
          <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 py-4">
            <div className="flex h-(--size-control-admin) items-center justify-between gap-4 px-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <h2 className="t-barra text-negro">{textos.todos}</h2>
                <p className="t-small text-negro">
                  {formatNumber(datos.total, 'es')} {textos.registros}
                </p>
              </div>
              <BotonPildora onClick={() => setModal('crear')}>{textos.registrar}</BotonPildora>
            </div>
            <div className="flex h-(--size-control-admin) items-center gap-2 rounded-btn bg-crema-tono px-4">
              <ChipFiltro activo={filtro === 'todos'} onClick={() => elegirFiltro('todos')}>
                {textos.filtros.todos}
              </ChipFiltro>
              <ChipFiltro activo={filtro === 'adoptados'} onClick={() => elegirFiltro('adoptados')}>
                {textos.filtros.adoptados}
              </ChipFiltro>
              <ChipFiltro
                activo={filtro === 'en-la-fundacion'}
                onClick={() => elegirFiltro('en-la-fundacion')}
              >
                {textos.filtros.enLaFundacion}
              </ChipFiltro>
            </div>
            <TablaSeleccion
              etiqueta={textos.todos}
              columnas={COLUMNAS}
              filas={visibles}
              seleccionId={seleccionId}
              onSeleccionar={setSeleccionId}
            />
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-3">
              <p className="t-small text-negro">{textoMostrando(datos)}</p>
              <Paginacion
                pagina={datos.pagina}
                totalPaginas={datos.totalPaginas}
                onCambiar={irAPagina}
                deshabilitado={cambiando}
              />
            </div>
          </div>
          {seleccionado ? (
            <PanelDetalle
              titulo={seleccionado.nombre}
              subtitulo={subtituloDe(seleccionado)}
              fotos={[
                {
                  src: fuenteVisible(seleccionado.fotoIngreso),
                  etiqueta: textos.alIngresar,
                },
                ...(estaAdoptado(seleccionado)
                  ? [
                      {
                        src: fuenteVisible(seleccionado.fotoAdopcion),
                        etiqueta: textos.enSuAdopcion,
                      },
                    ]
                  : []),
              ]}
              accion={
                <BotonPildora variante="ghost" onClick={() => setModal(seleccionado)}>
                  {textos.editarRegistro}
                </BotonPildora>
              }
              filas={filasDetalle(seleccionado)}
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
        <AnimalFormModal
          key={modal === 'crear' ? 'crear' : modal.id}
          animal={modal === 'crear' ? null : modal}
          onCerrar={() => setModal(null)}
          onGuardado={(id, fotos) => {
            setModal(null);
            setFotoPendiente(fotos ? { ...fotos, id } : null);
            setToast(fotos ? null : textosAdmin.supuestos.guardado);
            // Un animal nuevo aparece primero (orden por fecha de creación).
            if (modal === 'crear') setPagina(1);
            recargar(id);
          }}
          onEliminado={() => {
            setModal(null);
            setFotoPendiente(null);
            setToast(textosAdmin.supuestos.guardado);
            setSeleccionId(null);
            recargar();
          }}
        />
      ) : null}
    </div>
  );
}
