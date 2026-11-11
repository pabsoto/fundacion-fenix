import { useState } from 'react';
import {
  Calendar,
  Heart,
  Lock,
  MapPin,
  Mars,
  PawPrint,
  User,
  Venus,
} from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { ANIMALES_EJEMPLO, RESUMEN_EJEMPLO } from '@/services/admin/demo/datos-ejemplo';
import type { Animal, Especie, FiltroAnimales, Sexo, UnidadEdad } from '@/types/admin';
import { estaAdoptado } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { CampoTexto } from '@/components/admin/ui/CampoTexto';
import { ChipFiltro } from '@/components/admin/ui/ChipFiltro';
import { Interruptor } from '@/components/admin/ui/Interruptor';
import { MarcaEstado } from '@/components/admin/ui/MarcaEstado';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';
import { PanelDetalle } from '@/components/admin/ui/PanelDetalle';
import { TablaSeleccion } from '@/components/admin/ui/TablaSeleccion';
import { TarjetaKpi } from '@/components/admin/ui/TarjetaKpi';
import { ZonaFotos } from '@/components/admin/ui/ZonaFotos';
import { Card } from '@/components/ui/Card';

const icono = 'size-4';

function filtrar(filtro: FiltroAnimales) {
  if (filtro === 'adoptados') return ANIMALES_EJEMPLO.filter((animal) => estaAdoptado(animal));
  if (filtro === 'en-la-fundacion') {
    return ANIMALES_EJEMPLO.filter((animal) => !estaAdoptado(animal));
  }
  return ANIMALES_EJEMPLO;
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
  if (edad.unidad === 'meses') return `${edad.valor} ${textosAdmin.animales.meses}`;
  const unidad = edad.valor === 1 ? textosAdmin.animales.ano : textosAdmin.animales.anios;
  return `${edad.valor} ${unidad}`;
}

function fechaCorta(iso: string | null) {
  if (!iso) return textosAdmin.animales.sinAdoptante;
  const [anio, mes, dia] = iso.split('-').map(Number);
  if (!anio || !mes || !dia) return textosAdmin.animales.sinAdoptante;
  return new Intl.DateTimeFormat('es-BO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(anio, mes - 1, dia))
    .replace(/\./g, '')
    .replace(/ de /g, ' ');
}

function textoMostrando(visibles: number, total: number) {
  if (visibles === total && total === ANIMALES_EJEMPLO.length) return textosAdmin.animales.mostrando;
  return textosAdmin.animales.mostrando.replace('8 de 8', `${visibles} de ${total}`);
}

function CeldaNombre({ nombre }: { nombre: string }) {
  const inicial = nombre.trim().charAt(0).toUpperCase();
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-inicial shrink-0 items-center justify-center rounded-full bg-crema-tono t-inicial text-negro">
        {inicial}
      </span>
      <span className="t-fila-nombre text-negro">{nombre}</span>
    </span>
  );
}

export function ComponentesAdminPage() {
  const [filtro, setFiltro] = useState<FiltroAnimales>('todos');
  const [seleccionId, setSeleccionId] = useState(ANIMALES_EJEMPLO[0]?.id ?? null);
  const [modal, setModal] = useState(false);
  const [interruptorSuelto, setInterruptorSuelto] = useState(false);
  const [fotoSuelta, setFotoSuelta] = useState<File[]>([]);
  const [muestraNombre, setMuestraNombre] = useState('');

  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<Especie>('perro');
  const [sexo, setSexo] = useState<Sexo | null>('macho');
  const [edad, setEdad] = useState('0');
  const [unidad, setUnidad] = useState<UnidadEdad>('años');
  const [fecha, setFecha] = useState('09 / 11 / 2026');
  const [fotoIngreso, setFotoIngreso] = useState<File[]>([]);
  const [adoptado, setAdoptado] = useState(true);
  const [adoptante, setAdoptante] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fotoAdopcion, setFotoAdopcion] = useState<File[]>([]);

  const visibles = filtrar(filtro);
  const seleccionado = visibles.find((animal) => animal.id === seleccionId) ?? visibles[0] ?? null;

  function elegirFiltro(siguiente: FiltroAnimales) {
    const lista = filtrar(siguiente);
    setFiltro(siguiente);
    setSeleccionId((actual) =>
      lista.some((animal) => animal.id === actual) ? actual : (lista[0]?.id ?? null),
    );
  }

  function cambiarAdopcion(activo: boolean) {
    setAdoptado(activo);
    if (!activo) {
      setAdoptante('');
      setDireccion('');
      setFotoAdopcion([]);
    }
  }

  function elegirSexo(siguiente: Sexo) {
    setSexo((actual) => (actual === siguiente ? null : siguiente));
  }

  return (
    <div className="min-h-screen bg-crema px-pagina-admin py-10 text-negro">
      <div className="mx-auto flex w-full max-w-lienzo-admin flex-col gap-10">
        <header className="flex flex-col gap-1">
          <h1 className="t-detalle text-negro">{textosAdmin.componentes.titulo}</h1>
          <p className="t-control text-texto-secundario">{textosAdmin.componentes.nota}</p>
        </header>

        <section className="flex flex-col gap-3">
          <p className="t-nav text-texto-secundario">{textosAdmin.componentes.boton}</p>
          <div className="flex flex-wrap items-center gap-3">
            <BotonPildora onClick={() => setModal(true)}>
              {textosAdmin.animales.registrar}
            </BotonPildora>
            <BotonPildora variante="ghost">{textosAdmin.registrarAnimal.cancelar}</BotonPildora>
            <BotonPildora variante="ghost">{textosAdmin.animales.editarRegistro}</BotonPildora>
            <BotonPildora disabled>{textosAdmin.registrarAnimal.guardar}</BotonPildora>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <p className="t-nav text-texto-secundario">{textosAdmin.componentes.chip}</p>
          <div className="flex flex-wrap items-center gap-2">
            <ChipFiltro activo onClick={() => undefined}>
              {textosAdmin.animales.filtros.todos}
            </ChipFiltro>
            <ChipFiltro onClick={() => undefined}>{textosAdmin.animales.filtros.adoptados}</ChipFiltro>
            <ChipFiltro onClick={() => undefined}>
              {textosAdmin.animales.filtros.enLaFundacion}
            </ChipFiltro>
            <ChipFiltro activo onClick={() => undefined}>
              {textosAdmin.registrarAnimal.perro}
            </ChipFiltro>
            <ChipFiltro onClick={() => undefined}>{textosAdmin.registrarAnimal.gato}</ChipFiltro>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <p className="t-nav text-texto-secundario">{textosAdmin.componentes.kpi}</p>
          <Card radius="admin" elevated="panel" className="flex p-3">
            <TarjetaKpi
              destacada
              etiqueta={textosAdmin.resumen.esterilizaciones}
              valor={formatNumber(RESUMEN_EJEMPLO.esterilizaciones.total, 'es')}
              nota={textosAdmin.resumen.enJornadas(RESUMEN_EJEMPLO.esterilizaciones.jornadas)}
            />
            <TarjetaKpi
              separador
              etiqueta={textosAdmin.resumen.enLaFundacion}
              valor={formatNumber(RESUMEN_EJEMPLO.enLaFundacion.cantidad, 'es')}
              nota={textosAdmin.resumen.deRegistrados(RESUMEN_EJEMPLO.enLaFundacion.registrados)}
            />
            <TarjetaKpi
              separador
              etiqueta={textosAdmin.resumen.adopciones}
              valor={formatNumber(RESUMEN_EJEMPLO.adopcionesDelAnio.cantidad, 'es')}
              nota={textosAdmin.resumen.enLoQueVa(RESUMEN_EJEMPLO.adopcionesDelAnio.anio)}
            />
            <TarjetaKpi
              etiqueta={textosAdmin.resumen.diasHastaAdoptar}
              valor={
                RESUMEN_EJEMPLO.diasHastaAdoptar === null
                  ? textosAdmin.animales.sinAdoptante
                  : formatNumber(RESUMEN_EJEMPLO.diasHastaAdoptar, 'es')
              }
              nota={textosAdmin.resumen.promedio}
            />
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="t-nav text-texto-secundario">{textosAdmin.componentes.campo}</p>
            <CampoTexto
              id="muestra-nombre"
              etiqueta={textosAdmin.registrarAnimal.nombre}
              valor={muestraNombre}
              onChange={setMuestraNombre}
              placeholder={textosAdmin.registrarAnimal.nombrePlaceholder}
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="t-nav text-texto-secundario">{textosAdmin.componentes.interruptor}</p>
            <Interruptor
              id="muestra-switch"
              etiqueta={textosAdmin.registrarAnimal.yaAdoptado}
              nota={textosAdmin.registrarAnimal.yaAdoptadoNota}
              activo={interruptorSuelto}
              onChange={setInterruptorSuelto}
            />
          </div>
          <div className="flex flex-col gap-3 md:col-span-2">
            <p className="t-nav text-texto-secundario">{textosAdmin.componentes.fotos}</p>
            <ZonaFotos
              id="muestra-foto"
              texto={textosAdmin.registrarAnimal.agregarFoto}
              archivos={fotoSuelta}
              onArchivos={setFotoSuelta}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <p className="t-nav text-texto-secundario">{textosAdmin.componentes.tabla}</p>
          <Card radius="admin" elevated="panel" className="flex items-stretch overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col gap-3 px-3 py-4">
              <div className="flex h-(--size-control-admin) items-center justify-between px-3">
                <div className="flex items-center gap-2.5">
                  <p className="t-barra text-negro">{textosAdmin.animales.todos}</p>
                  <p className="t-small text-negro">
                    {visibles.length} {textosAdmin.animales.registros}
                  </p>
                </div>
                <BotonPildora onClick={() => setModal(true)}>
                  {textosAdmin.animales.registrar}
                </BotonPildora>
              </div>
              <div className="flex h-(--size-control-admin) items-center gap-2 rounded-btn bg-crema-tono px-4">
                <ChipFiltro activo={filtro === 'todos'} onClick={() => elegirFiltro('todos')}>
                  {textosAdmin.animales.filtros.todos}
                </ChipFiltro>
                <ChipFiltro
                  activo={filtro === 'adoptados'}
                  onClick={() => elegirFiltro('adoptados')}
                >
                  {textosAdmin.animales.filtros.adoptados}
                </ChipFiltro>
                <ChipFiltro
                  activo={filtro === 'en-la-fundacion'}
                  onClick={() => elegirFiltro('en-la-fundacion')}
                >
                  {textosAdmin.animales.filtros.enLaFundacion}
                </ChipFiltro>
              </div>
              <div className="overflow-x-auto">
                <TablaSeleccion
                  etiqueta={textosAdmin.animales.todos}
                  filas={visibles}
                  seleccionId={seleccionado?.id ?? null}
                  onSeleccionar={setSeleccionId}
                  columnas={[
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
                      celda: (animal) => (
                        <span className="t-fila text-negro">{textoEspecie(animal.especie)}</span>
                      ),
                    },
                    {
                      id: 'sexo',
                      encabezado: textosAdmin.animales.columnas.sexo,
                      className: 'w-col-corta',
                      celda: (animal) => (
                        <span className="t-fila text-negro">{textoSexo(animal.sexo)}</span>
                      ),
                    },
                    {
                      id: 'edad',
                      encabezado: textosAdmin.animales.columnas.edad,
                      className: 'w-col-corta',
                      celda: (animal) => (
                        <span className="t-fila text-negro">{textoEdad(animal.edad)}</span>
                      ),
                    },
                    {
                      id: 'estado',
                      encabezado: textosAdmin.animales.columnas.estado,
                      className: 'w-col-estado',
                      celda: (animal) => (
                        <MarcaEstado activo={estaAdoptado(animal)}>
                          {estaAdoptado(animal)
                            ? textosAdmin.estado.adoptado
                            : textosAdmin.estado.enLaFundacion}
                        </MarcaEstado>
                      ),
                    },
                    {
                      id: 'adoptado',
                      encabezado: textosAdmin.animales.columnas.adoptadoPor,
                      className: 'w-col-adoptante',
                      celda: (animal) => (
                        <span className="t-fila text-negro">
                          {animal.adoptadoPor ?? textosAdmin.animales.sinAdoptante}
                        </span>
                      ),
                    },
                  ]}
                />
              </div>
              <p className="t-small text-negro">
                {textoMostrando(visibles.length, ANIMALES_EJEMPLO.length)}
              </p>
            </div>
            {seleccionado ? (
              <PanelDetalle
                titulo={seleccionado.nombre}
                subtitulo={`${textoEspecie(seleccionado.especie)} · ${textoEdad(seleccionado.edad)}`}
                fotos={[
                  { src: seleccionado.fotoIngreso, etiqueta: textosAdmin.animales.alIngresar },
                  ...(estaAdoptado(seleccionado)
                    ? [{ src: seleccionado.fotoAdopcion, etiqueta: textosAdmin.animales.enSuAdopcion }]
                    : []),
                ]}
                accion={
                  <BotonPildora variante="ghost" onClick={() => setModal(true)}>
                    {textosAdmin.animales.editarRegistro}
                  </BotonPildora>
                }
                filas={[
                  {
                    id: 'especie',
                    icono: <PawPrint className={icono} />,
                    etiqueta: textosAdmin.animales.columnas.especie,
                    valor: textoEspecie(seleccionado.especie),
                  },
                  {
                    id: 'sexo',
                    icono: seleccionado.sexo === 'hembra' ? (
                      <Venus className={icono} />
                    ) : (
                      <Mars className={icono} />
                    ),
                    etiqueta: textosAdmin.animales.columnas.sexo,
                    valor: textoSexo(seleccionado.sexo),
                  },
                  {
                    id: 'edad',
                    icono: <Calendar className={icono} />,
                    etiqueta: textosAdmin.animales.columnas.edad,
                    valor: textoEdad(seleccionado.edad),
                  },
                  {
                    id: 'ingreso',
                    icono: <Calendar className={icono} />,
                    etiqueta: textosAdmin.animales.ingreso,
                    valor: fechaCorta(seleccionado.fechaIngreso),
                  },
                  {
                    id: 'estado',
                    icono: <Heart className={icono} />,
                    etiqueta: textosAdmin.animales.columnas.estado,
                    valor: (
                      <MarcaEstado activo={estaAdoptado(seleccionado)}>
                        {estaAdoptado(seleccionado)
                          ? textosAdmin.estado.adoptado
                          : textosAdmin.estado.enLaFundacion}
                      </MarcaEstado>
                    ),
                  },
                  ...(estaAdoptado(seleccionado)
                    ? [
                        {
                          id: 'adoptante',
                          icono: <User className={icono} />,
                          etiqueta: textosAdmin.animales.columnas.adoptadoPor,
                          valor: seleccionado.adoptadoPor ?? textosAdmin.animales.sinAdoptante,
                          divisor: false,
                        },
                        {
                          id: 'direccion',
                          icono: <MapPin className={icono} />,
                          etiqueta: textosAdmin.animales.direccion,
                          valor: seleccionado.direccionAdoptante ?? textosAdmin.animales.sinAdoptante,
                          divisor: false,
                          alto: 'auto' as const,
                          valorClassName: 'w-direccion',
                        },
                      ]
                    : []),
                ]}
              />
            ) : null}
          </Card>
        </section>
      </div>

      <ModalAdmin
        abierto={modal}
        titulo={textosAdmin.registrarAnimal.titulo}
        subtitulo={textosAdmin.registrarAnimal.subtitulo}
        onCerrar={() => setModal(false)}
        pie={
          <>
            <BotonPildora variante="ghost" onClick={() => setModal(false)}>
              {textosAdmin.registrarAnimal.cancelar}
            </BotonPildora>
            <BotonPildora onClick={() => setModal(false)}>
              {textosAdmin.registrarAnimal.guardar}
            </BotonPildora>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <CampoTexto
              id="animal-nombre"
              etiqueta={textosAdmin.registrarAnimal.nombre}
              valor={nombre}
              onChange={setNombre}
              placeholder={textosAdmin.registrarAnimal.nombrePlaceholder}
            />
            <div className="flex flex-col gap-2">
              <span className="t-chip text-negro">{textosAdmin.registrarAnimal.especie}</span>
              <div className="flex h-(--size-control-admin) items-center gap-2">
                <ChipFiltro activo={especie === 'perro'} onClick={() => setEspecie('perro')}>
                  {textosAdmin.registrarAnimal.perro}
                </ChipFiltro>
                <ChipFiltro activo={especie === 'gato'} onClick={() => setEspecie('gato')}>
                  {textosAdmin.registrarAnimal.gato}
                </ChipFiltro>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="t-chip text-negro">{textosAdmin.registrarAnimal.sexo}</span>
              <div className="flex h-(--size-control-admin) items-center gap-2">
                <ChipFiltro activo={sexo === 'macho'} onClick={() => elegirSexo('macho')}>
                  {textosAdmin.registrarAnimal.macho}
                </ChipFiltro>
                <ChipFiltro activo={sexo === 'hembra'} onClick={() => elegirSexo('hembra')}>
                  {textosAdmin.registrarAnimal.hembra}
                </ChipFiltro>
              </div>
            </div>
            <CampoTexto
              id="animal-edad"
              etiqueta={textosAdmin.registrarAnimal.edad}
              tipo="number"
              valor={edad}
              onChange={setEdad}
              placeholder={textosAdmin.registrarAnimal.edadPlaceholder}
              acompanante={
                <>
                  <ChipFiltro activo={unidad === 'años'} onClick={() => setUnidad('años')}>
                    {textosAdmin.registrarAnimal.anios}
                  </ChipFiltro>
                  <ChipFiltro activo={unidad === 'meses'} onClick={() => setUnidad('meses')}>
                    {textosAdmin.registrarAnimal.meses}
                  </ChipFiltro>
                </>
              }
            />
          </div>
          <div className="w-campo-corto max-w-full">
            <CampoTexto
              id="animal-fecha"
              etiqueta={textosAdmin.registrarAnimal.fechaIngreso}
              valor={fecha}
              onChange={setFecha}
              icono={<Calendar className={icono} />}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="t-chip text-negro">{textosAdmin.registrarAnimal.fotoIngreso}</span>
            <ZonaFotos
              id="animal-foto-ingreso"
              texto={textosAdmin.registrarAnimal.agregarFoto}
              archivos={fotoIngreso}
              onArchivos={setFotoIngreso}
            />
          </div>
          <Interruptor
            id="animal-adoptado"
            etiqueta={textosAdmin.registrarAnimal.yaAdoptado}
            nota={textosAdmin.registrarAnimal.yaAdoptadoNota}
            activo={adoptado}
            onChange={cambiarAdopcion}
          />
          {adoptado ? (
            <div className="flex flex-col gap-4 border-t border-linea pt-5">
              <div className="flex flex-col gap-1">
                <p className="t-nav font-semibold text-negro">
                  {textosAdmin.registrarAnimal.datosAdopcion}
                </p>
                <p className="flex items-center gap-1.5 t-small text-negro">
                  <Lock className={icono} aria-hidden="true" />
                  {textosAdmin.registrarAnimal.notaPrivada}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto
                  id="animal-adoptante"
                  etiqueta={textosAdmin.registrarAnimal.adoptadoPor}
                  valor={adoptante}
                  onChange={setAdoptante}
                  placeholder={textosAdmin.registrarAnimal.adoptadoPorPlaceholder}
                  icono={<User className={icono} />}
                />
                <CampoTexto
                  id="animal-direccion"
                  etiqueta={textosAdmin.registrarAnimal.direccion}
                  valor={direccion}
                  onChange={setDireccion}
                  placeholder={textosAdmin.registrarAnimal.direccionPlaceholder}
                  icono={<MapPin className={icono} />}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="t-chip text-negro">{textosAdmin.registrarAnimal.fotoAdopcion}</span>
                <ZonaFotos
                  id="animal-foto-adopcion"
                  texto={textosAdmin.registrarAnimal.agregarFotoAdopcion}
                  archivos={fotoAdopcion}
                  onArchivos={setFotoAdopcion}
                />
              </div>
            </div>
          ) : null}
        </div>
      </ModalAdmin>
    </div>
  );
}
