import { useEffect, useId, useState } from 'react';
import {
  Calendar,
  Cat,
  ChevronDown,
  ChevronUp,
  Ellipsis,
  Heart,
  MapPin,
  Mars,
  PawPrint,
  Plus,
  Search,
  User,
  Venus,
  X,
} from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import {
  estaAdoptado,
  type Animal,
  type Especie,
  type FiltroAnimales,
  type Pagina,
  type Sexo,
} from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { ChipFiltro } from '@/components/admin/ui/ChipFiltro';
import { cn } from '@/lib/cn';

const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const;

const icono = 'size-4';

function textoEspecie(especie: Especie) {
  return especie === 'perro' ? textosAdmin.registrarAnimal.perro : textosAdmin.registrarAnimal.gato;
}

function textoSexo(sexo: Sexo | null) {
  if (sexo === 'macho') return textosAdmin.registrarAnimal.macho;
  if (sexo === 'hembra') return textosAdmin.registrarAnimal.hembra;
  return '';
}

function textoEdad(edad: Animal['edad']) {
  if (!edad) return '';
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

function lineaDe(animal: Animal): string {
  const partes: string[] = [textoEspecie(animal.especie)];
  const sexo = textoSexo(animal.sexo);
  const edad = textoEdad(animal.edad);
  if (sexo) partes.push(sexo);
  if (edad) partes.push(edad);
  return partes.join(' · ');
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

function cifrasDe(items: Animal[]) {
  return items.reduce(
    (acc, animal) => {
      if (animal.especie === 'perro') acc.perros += 1;
      else acc.gatos += 1;
      if (animal.sexo === 'macho') acc.machos += 1;
      if (animal.sexo === 'hembra') acc.hembras += 1;
      if (estaAdoptado(animal)) acc.adoptados += 1;
      return acc;
    },
    { perros: 0, gatos: 0, machos: 0, hembras: 0, adoptados: 0 },
  );
}

function AvatarAnimal({ nombre, foto }: { nombre: string; foto: string | null }) {
  const [rota, setRota] = useState(false);
  const src = rota ? null : fuenteVisible(foto);

  return (
    <span className="bg-crema-tono flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full">
      {src ? (
        <img src={src} alt="" className="size-full object-cover" onError={() => setRota(true)} />
      ) : (
        <span className="t-inicial-movil text-negro">{inicialDe(nombre)}</span>
      )}
    </span>
  );
}

function FotoAnimal({ src, etiqueta }: { src: string | null; etiqueta: string }) {
  const [rota, setRota] = useState(false);
  const visible = Boolean(src) && !rota;

  return (
    <span className="bg-crema-tono relative h-foto-detalle min-w-0 flex-1 overflow-hidden rounded-btn">
      {visible ? (
        <img
          src={src ?? undefined}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={() => setRota(true)}
        />
      ) : null}
      <span className="t-foto text-negro absolute bottom-2 left-2 rounded-pill bg-blanco px-2.5 py-1">
        {etiqueta}
      </span>
    </span>
  );
}

type AdminAnimalesMovilProps = {
  datos: Pagina<Animal>;
  filtro: FiltroAnimales;
  onFiltro: (filtro: FiltroAnimales) => void;
  onCrear: () => void;
  onEditar: (animal: Animal) => void;
  onCargarMas: () => void;
  cargandoMas: boolean;
};

export function AdminAnimalesMovil({
  datos,
  filtro,
  onFiltro,
  onCrear,
  onEditar,
  onCargarMas,
  cargandoMas,
}: AdminAnimalesMovilProps) {
  const textos = textosAdmin.animales;
  const menuId = useId();
  const [busqueda, setBusqueda] = useState('');
  const [resumenAbierto, setResumenAbierto] = useState(false);
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [fabCompacto, setFabCompacto] = useState(false);
  const consulta = busqueda.trim();
  const visibles = datos.items.filter((animal) => {
    if (!consulta) return true;
    return animal.nombre.toLocaleLowerCase('es').includes(consulta.toLocaleLowerCase('es'));
  });
  const cifras = cifrasDe(datos.items);
  const adoptados =
    filtro === 'adoptados' ? datos.total : filtro === 'en-la-fundacion' ? 0 : cifras.adoptados;
  const hayMas = datos.pagina < datos.totalPaginas;

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
          <ChipFiltro
            activo={filtro === 'todos'}
            className="h-11 px-3.5"
            onClick={() => onFiltro('todos')}
          >
            {textos.filtros.todos}
          </ChipFiltro>
          <ChipFiltro
            activo={filtro === 'adoptados'}
            className="h-11 px-3.5"
            onClick={() => onFiltro('adoptados')}
          >
            {textos.filtros.adoptados}
          </ChipFiltro>
          <ChipFiltro
            activo={filtro === 'en-la-fundacion'}
            className="h-11 px-3.5"
            onClick={() => onFiltro('en-la-fundacion')}
          >
            {textos.filtros.enLaFundacion}
          </ChipFiltro>
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

      <div className="bg-crema-tono flex flex-col rounded-admin py-3 pr-3 pl-4">
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2.5 text-left"
          aria-expanded={resumenAbierto}
          onClick={() => setResumenAbierto((abierto) => !abierto)}
        >
          <span className="t-resumen-movil text-naranja shrink-0">
            {formatNumber(datos.total, 'es')}
          </span>
          <span className="t-control text-negro min-w-0 flex-1">{textos.resumenLinea(datos.total, adoptados)}</span>
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
                [textos.resumenTarjetas.perros, cifras.perros],
                [textos.resumenTarjetas.gatos, cifras.gatos],
                [textos.resumenTarjetas.machos, cifras.machos],
                [textos.resumenTarjetas.hembras, cifras.hembras],
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
          <PawPrint className="size-8" aria-hidden="true" />
          <p className="t-control text-negro">{textos.vacioTitulo}</p>
          <BotonPildora onClick={onCrear}>{textos.registrarCorta}</BotonPildora>
        </div>
      ) : null}

      {datos.total > 0 && visibles.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p className="t-control text-negro">{textos.sinResultados(consulta || textos.filtros.todos)}</p>
          <BotonPildora
            variante="ghost"
            onClick={() => {
              setBusqueda('');
              onFiltro('todos');
            }}
          >
            {textos.limpiar}
          </BotonPildora>
        </div>
      ) : null}

      <ul className="flex flex-col gap-3">
        {visibles.map((animal) => {
          const abierta = expandidaId === animal.id;
          const adoptado = estaAdoptado(animal);
          return (
            <li
              key={animal.id}
              className="border-negro bg-blanco shadow-tarjeta-movil rounded-admin border p-4"
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                aria-expanded={abierta}
                onClick={() => setExpandidaId(abierta ? null : animal.id)}
              >
                <AvatarAnimal nombre={animal.nombre} foto={animal.fotoIngreso} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="t-nombre-movil text-negro truncate">{animal.nombre}</span>
                  <span className="t-nota text-negro truncate">{lineaDe(animal)}</span>
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'size-2.5 shrink-0 rounded-full border border-negro',
                        adoptado ? 'bg-amarillo' : 'bg-transparent',
                      )}
                    />
                    <span className="t-nota text-negro">
                      {adoptado ? textosAdmin.estado.adoptado : textosAdmin.estado.enLaFundacion}
                    </span>
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
                    <FotoAnimal src={fuenteVisible(animal.fotoIngreso)} etiqueta={textos.alIngresar} />
                    {adoptado ? (
                      <FotoAnimal
                        src={fuenteVisible(animal.fotoAdopcion)}
                        etiqueta={textos.enSuAdopcion}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="border-linea bg-crema-tono t-detalle flex size-(--spacing-mini-movil) shrink-0 items-center justify-center self-center rounded-btn border border-dashed"
                      aria-label={textosAdmin.registrarAnimal.agregarFoto}
                      onClick={() => onEditar(animal)}
                    >
                      +
                    </button>
                  </div>
                  <dl>
                    <Fila
                      icono={
                        animal.especie === 'gato' ? (
                          <Cat className={icono} aria-hidden="true" />
                        ) : (
                          <PawPrint className={icono} aria-hidden="true" />
                        )
                      }
                      etiqueta={textos.columnas.especie}
                      valor={textoEspecie(animal.especie)}
                    />
                    <Fila
                      icono={
                        animal.sexo === 'hembra' ? (
                          <Venus className={icono} aria-hidden="true" />
                        ) : (
                          <Mars className={icono} aria-hidden="true" />
                        )
                      }
                      etiqueta={textos.columnas.sexo}
                      valor={textoSexo(animal.sexo) || textos.sinAdoptante}
                    />
                    <Fila
                      icono={<Calendar className={icono} aria-hidden="true" />}
                      etiqueta={textos.columnas.edad}
                      valor={textoEdad(animal.edad) || textos.sinAdoptante}
                    />
                    <Fila
                      icono={<Calendar className={icono} aria-hidden="true" />}
                      etiqueta={textos.ingreso}
                      valor={fechaCorta(animal.fechaIngreso)}
                    />
                    <Fila
                      icono={<Heart className={icono} aria-hidden="true" />}
                      etiqueta={textos.columnas.estado}
                      valor={adoptado ? textosAdmin.estado.adoptado : textosAdmin.estado.enLaFundacion}
                      divisor={!adoptado}
                    />
                    {adoptado ? (
                      <>
                        <Fila
                          icono={<User className={icono} aria-hidden="true" />}
                          etiqueta={textos.columnas.adoptadoPor}
                          valor={animal.adoptadoPor ?? textos.sinAdoptante}
                          divisor={false}
                        />
                        <Fila
                          icono={<MapPin className={icono} aria-hidden="true" />}
                          etiqueta={textos.direccion}
                          valor={animal.direccionAdoptante ?? textos.sinAdoptante}
                          divisor={false}
                        />
                      </>
                    ) : null}
                  </dl>
                  <BotonPildora variante="ghost" className="w-full" onClick={() => onEditar(animal)}>
                    {textos.editarRegistro}
                  </BotonPildora>
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
        {fabCompacto ? (
          <span className="sr-only">{textos.registrarCorta}</span>
        ) : (
          <span className="t-nav">{textos.registrarCorta}</span>
        )}
      </button>
    </div>
  );
}

function Fila({
  icono: iconoFila,
  etiqueta,
  valor,
  divisor = true,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string;
  divisor?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-h-dato-admin items-center justify-between gap-3 py-2',
        divisor && 'border-linea border-b',
      )}
    >
      <dt className="t-nav text-negro flex shrink-0 items-center gap-2.5">
        {iconoFila}
        {etiqueta}
      </dt>
      <dd className="t-nav text-negro min-w-0 text-right whitespace-normal">{valor}</dd>
    </div>
  );
}
