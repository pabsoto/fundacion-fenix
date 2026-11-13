import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Lock, MapPin, Trash2, User, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import {
  validarAnimal,
  type AnimalFormulario,
  type ErroresAnimal,
} from '@/schemas/animal';
import {
  deleteAnimal,
  guardarAnimal,
  quitarFotoAnimal,
  subirFotoAnimal,
} from '@/services/admin/animales.service';
import { estaAdoptado, type Animal, type Especie, type Sexo, type UnidadEdad } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { CampoTexto } from '@/components/admin/ui/CampoTexto';
import { ChipFiltro } from '@/components/admin/ui/ChipFiltro';
import { ConfirmarEliminarModal } from '@/components/admin/ui/ConfirmarEliminarModal';
import { Interruptor } from '@/components/admin/ui/Interruptor';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';
import { ZonaFotos, type FotoExistente } from '@/components/admin/ui/ZonaFotos';

export type FotosPendientes = {
  ingreso: File | null;
  adopcion: File | null;
  quitarIngreso: boolean;
  quitarAdopcion: boolean;
};

type AnimalFormModalProps = {
  animal: Animal | null;
  onCerrar: () => void;
  onGuardado: (id: string, fotos: FotosPendientes | null) => void;
  onEliminado: () => void;
  /** En móvil el formulario ocupa la pantalla, con la barra de acciones fija. */
  pantallaCompleta?: boolean;
};

function fechaHoy(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

function formularioDe(animal: Animal | null): AnimalFormulario {
  if (!animal) {
    return {
      nombre: '',
      especie: 'perro',
      sexo: 'macho',
      edadValor: '',
      edadUnidad: 'años',
      fechaIngreso: fechaHoy(),
      fotoIngreso: null,
      adoptado: true,
      adoptadoPor: '',
      direccionAdoptante: '',
      fotoAdopcion: null,
    };
  }
  return {
    nombre: animal.nombre,
    especie: animal.especie,
    sexo: animal.sexo,
    edadValor: animal.edad ? String(animal.edad.valor) : '',
    edadUnidad: animal.edad?.unidad ?? 'años',
    fechaIngreso: animal.fechaIngreso ?? '',
    fotoIngreso: null,
    adoptado: estaAdoptado(animal),
    adoptadoPor: animal.adoptadoPor ?? '',
    direccionAdoptante: animal.direccionAdoptante ?? '',
    fotoAdopcion: null,
  };
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

function hayFotos(fotos: FotosPendientes): boolean {
  return Boolean(fotos.ingreso || fotos.adopcion || fotos.quitarIngreso || fotos.quitarAdopcion);
}

function PantallaAnimal({
  titulo,
  subtitulo,
  onCerrar,
  pie,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  pie?: React.ReactNode;
  children: React.ReactNode;
  abierto?: boolean;
}) {
  return createPortal(
    <div className="bg-crema fixed inset-0 z-50 flex flex-col pt-[env(safe-area-inset-top,0px)]">
      <header className="flex items-center gap-3 px-4 py-1.5">
        <button
          type="button"
          className="border-linea flex size-11 items-center justify-center rounded-pill border"
          aria-label={textosAdmin.registrarAnimal.cerrar}
          onClick={onCerrar}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
        <h1 className="t-pantalla-movil text-negro">{titulo}</h1>
      </header>
      <div className="bg-linea h-px" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-4">
        {subtitulo ? <p className="t-control text-negro mb-5">{subtitulo}</p> : null}
        {children}
      </div>
      <div className="border-linea bg-blanco flex items-center gap-3 border-t px-4 pt-3 pb-[max(2.125rem,env(safe-area-inset-bottom,0px))]">
        {pie}
      </div>
    </div>,
    document.body,
  );
}

function ConfirmacionEliminarMovil({
  titulo,
  cuerpo,
  accion,
  cancelar,
  borrando,
  error,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  cuerpo: string;
  accion: string;
  cancelar: string;
  borrando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const tituloId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef(onCancelar);

  useEffect(() => {
    cancelarRef.current = onCancelar;
  }, [onCancelar]);

  useEffect(() => {
    const previo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function alTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape' && !borrando) {
        event.preventDefault();
        cancelarRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodo = dialogRef.current;
      if (!nodo) return;
      const lista = [...nodo.querySelectorAll<HTMLElement>('button:not([disabled])')];
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (!primero || !ultimo) return;
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    }
    document.addEventListener('keydown', alTeclado);
    return () => {
      document.removeEventListener('keydown', alTeclado);
      previo?.focus();
    };
  }, [borrando]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <button
        type="button"
        className="bg-velo absolute inset-0"
        aria-label={cancelar}
        disabled={borrando}
        onClick={onCancelar}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="border-linea bg-blanco relative flex w-full flex-col gap-5 rounded-admin border p-6 outline-none"
      >
        <div className="flex flex-col gap-2">
          <h2 id={tituloId} className="t-total-detalle text-negro">
            {titulo}
          </h2>
          <p className="t-control text-negro">{cuerpo}</p>
        </div>
        {error ? (
          <p className="t-small text-naranja" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3">
          <BotonPildora
            variante="ghost"
            className="h-(--size-control-admin) w-full"
            disabled={borrando}
            onClick={onCancelar}
          >
            {cancelar}
          </BotonPildora>
          <BotonPildora
            variante="peligroSolido"
            className="h-(--size-control-admin) w-full"
            disabled={borrando}
            aria-busy={borrando}
            onClick={onConfirmar}
          >
            {borrando ? textosAdmin.supuestos.guardando : accion}
          </BotonPildora>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AnimalFormModal({
  animal,
  onCerrar,
  onGuardado,
  onEliminado,
  pantallaCompleta = false,
}: AnimalFormModalProps) {
  const textos = textosAdmin.registrarAnimal;
  const formId = useId();
  const especieId = useId();
  const sexoId = useId();
  const [formulario, setFormulario] = useState<AnimalFormulario>(() => formularioDe(animal));
  const [fotoIngresoUrl, setFotoIngresoUrl] = useState<string | null>(animal?.fotoIngreso ?? null);
  const [fotoAdopcionUrl, setFotoAdopcionUrl] = useState<string | null>(
    animal?.fotoAdopcion ?? null,
  );
  const [quitarIngreso, setQuitarIngreso] = useState(false);
  const [quitarAdopcion, setQuitarAdopcion] = useState(false);
  const [errores, setErrores] = useState<ErroresAnimal>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);
  const [descartar, setDescartar] = useState(false);
  const edicion = animal !== null;

  function actualizar<K extends keyof AnimalFormulario>(campo: K, valor: AnimalFormulario[K]) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function hayCambios() {
    const base = formularioDe(animal);
    const campos = (Object.keys(base) as (keyof AnimalFormulario)[]).some((campo) => {
      if (campo === 'fotoIngreso' || campo === 'fotoAdopcion') return false;
      return formulario[campo] !== base[campo];
    });
    return (
      campos ||
      Boolean(formulario.fotoIngreso) ||
      Boolean(formulario.fotoAdopcion) ||
      quitarIngreso ||
      quitarAdopcion
    );
  }

  function cerrar() {
    if (guardando || borrando) return;
    if (pantallaCompleta && hayCambios()) {
      setDescartar(true);
      return;
    }
    onCerrar();
  }

  useEffect(() => {
    if (!pantallaCompleta) return;
    function alTeclado(event: KeyboardEvent) {
      if (event.key === 'Escape') cerrar();
    }
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  });

  function elegirEspecie(especie: Especie) {
    if (guardando) return;
    actualizar('especie', especie);
  }

  function elegirSexo(sexo: Sexo) {
    if (guardando) return;
    actualizar('sexo', formulario.sexo === sexo ? null : sexo);
  }

  function elegirUnidad(unidad: UnidadEdad) {
    if (guardando) return;
    actualizar('edadUnidad', unidad);
  }

  function cambiarAdopcion(activo: boolean) {
    if (guardando) return;
    setFormulario((actual) => ({
      ...actual,
      adoptado: activo,
      adoptadoPor: activo ? actual.adoptadoPor : '',
      direccionAdoptante: activo ? actual.direccionAdoptante : '',
      fotoAdopcion: activo ? actual.fotoAdopcion : null,
    }));
    if (!activo) {
      setFotoAdopcionUrl(null);
      setQuitarAdopcion(true);
      setErrores((actual) => ({ ...actual, adoptadoPor: undefined, direccionAdoptante: undefined }));
    }
  }

  async function aplicarFotos(id: string): Promise<FotosPendientes | null> {
    const pendiente: FotosPendientes = {
      ingreso: null,
      adopcion: null,
      quitarIngreso: false,
      quitarAdopcion: false,
    };

    if (formulario.fotoIngreso) {
      try {
        await subirFotoAnimal(id, 'animal', formulario.fotoIngreso);
      } catch {
        pendiente.ingreso = formulario.fotoIngreso;
      }
    } else if (quitarIngreso && animal?.fotoIngreso) {
      try {
        await quitarFotoAnimal(id, 'animal');
      } catch {
        pendiente.quitarIngreso = true;
      }
    }

    if (formulario.adoptado && formulario.fotoAdopcion) {
      try {
        await subirFotoAnimal(id, 'entrega', formulario.fotoAdopcion);
      } catch {
        pendiente.adopcion = formulario.fotoAdopcion;
      }
    } else if (animal?.fotoAdopcion && (quitarAdopcion || !formulario.adoptado)) {
      try {
        await quitarFotoAnimal(id, 'entrega');
      } catch {
        pendiente.quitarAdopcion = true;
      }
    }

    return hayFotos(pendiente) ? pendiente : null;
  }

  async function guardar() {
    if (guardando) return;
    const resultado = validarAnimal(formulario);
    if (!resultado.ok) {
      setErrores(resultado.errores);
      setErrorGeneral(null);
      return;
    }

    setErrores({});
    setErrorGeneral(null);
    setGuardando(true);
    try {
      const guardado = await guardarAnimal(formulario, animal?.id);
      const fotos = await aplicarFotos(guardado.id);
      onGuardado(guardado.id, fotos);
    } catch {
      setErrorGeneral(textosAdmin.supuestos.error);
      setGuardando(false);
    }
  }

  async function eliminar() {
    if (!animal || borrando) return;
    setBorrando(true);
    setErrorBorrado(null);
    try {
      await deleteAnimal(animal.id);
      onEliminado();
    } catch {
      setErrorBorrado(textosAdmin.supuestos.error);
      setBorrando(false);
    }
  }

  const ingresoExistente: FotoExistente[] =
    fotoIngresoUrl && !formulario.fotoIngreso
      ? [
          {
            clave: 'ingreso',
            src: fuenteVisible(fotoIngresoUrl),
            nombre: textos.fotoIngreso,
          },
        ]
      : [];
  const adopcionExistente: FotoExistente[] =
    formulario.adoptado && fotoAdopcionUrl && !formulario.fotoAdopcion
      ? [
          {
            clave: 'adopcion',
            src: fuenteVisible(fotoAdopcionUrl),
            nombre: textos.fotoAdopcion,
          },
        ]
      : [];

  const Marco = pantallaCompleta ? PantallaAnimal : ModalAdmin;

  return (
    <>
      <Marco
        abierto
        titulo={edicion ? textos.editarTitulo : textos.titulo}
        subtitulo={textos.subtitulo}
        onCerrar={cerrar}
        pie={
          <>
            {edicion && !pantallaCompleta ? (
              <BotonPildora
                variante="ghost"
                className="mr-auto gap-2"
                disabled={guardando}
                onClick={() => setConfirmar(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {textos.eliminar}
              </BotonPildora>
            ) : null}
            <BotonPildora variante="ghost" disabled={guardando} onClick={cerrar}>
              {textos.cancelar}
            </BotonPildora>
            <BotonPildora
              type="submit"
              form={formId}
              disabled={guardando}
              aria-busy={guardando}
              className={pantallaCompleta ? 'min-w-0 flex-1' : undefined}
            >
              {guardando
                ? textosAdmin.supuestos.guardando
                : edicion
                  ? textos.guardarCambios
                  : textos.guardar}
            </BotonPildora>
          </>
        }
      >
        <form
          id={formId}
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void guardar();
          }}
        >
          {errorGeneral ? (
            <p className="t-small text-naranja" role="alert">
              {errorGeneral}
            </p>
          ) : null}
          <div className={pantallaCompleta ? 'flex flex-col gap-5' : 'flex items-start gap-4'}>
            <div className="min-w-0 flex-1">
              <CampoTexto
                id={`${formId}-nombre`}
                etiqueta={textos.nombre}
                valor={formulario.nombre}
                placeholder={textos.nombrePlaceholder}
                error={errores.nombre}
                deshabilitado={guardando}
                onChange={(valor) => actualizar('nombre', valor)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <span id={especieId} className="t-chip text-negro">
                  {textos.especie}
                </span>
                <div
                  role="group"
                  aria-labelledby={especieId}
                  className="flex h-(--size-control-admin) items-center gap-2"
                >
                  <ChipFiltro activo={formulario.especie === 'perro'} onClick={() => elegirEspecie('perro')}>
                    {textos.perro}
                  </ChipFiltro>
                  <ChipFiltro activo={formulario.especie === 'gato'} onClick={() => elegirEspecie('gato')}>
                    {textos.gato}
                  </ChipFiltro>
                </div>
                {errores.especie ? (
                  <p className="t-small text-naranja" role="alert">
                    {errores.especie}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <div className={pantallaCompleta ? 'flex flex-col gap-5' : 'flex items-start gap-4'}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-2">
                <span id={sexoId} className="t-chip text-negro">
                  {textos.sexo}
                </span>
                <div
                  role="group"
                  aria-labelledby={sexoId}
                  className="flex h-(--size-control-admin) items-center gap-2"
                >
                  <ChipFiltro activo={formulario.sexo === 'macho'} onClick={() => elegirSexo('macho')}>
                    {textos.macho}
                  </ChipFiltro>
                  <ChipFiltro activo={formulario.sexo === 'hembra'} onClick={() => elegirSexo('hembra')}>
                    {textos.hembra}
                  </ChipFiltro>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <CampoTexto
                id={`${formId}-edad`}
                etiqueta={textos.edad}
                tipo="number"
                valor={formulario.edadValor}
                placeholder={textos.edadPlaceholder}
                error={errores.edadValor ?? errores.edadUnidad}
                deshabilitado={guardando}
                onChange={(valor) => actualizar('edadValor', valor)}
                acompanante={
                  <>
                    <ChipFiltro activo={formulario.edadUnidad === 'años'} onClick={() => elegirUnidad('años')}>
                      {textos.anios}
                    </ChipFiltro>
                    <ChipFiltro
                      activo={formulario.edadUnidad === 'meses'}
                      onClick={() => elegirUnidad('meses')}
                    >
                      {textos.meses}
                    </ChipFiltro>
                  </>
                }
              />
            </div>
          </div>
          <div className={pantallaCompleta ? 'min-w-0' : 'w-campo-corto max-w-full'}>
            <CampoTexto
              id={`${formId}-fecha`}
              etiqueta={textos.fechaIngreso}
              tipo="date"
              idioma="es"
              valor={formulario.fechaIngreso}
              icono={<Calendar className="size-4" aria-hidden="true" />}
              error={errores.fechaIngreso}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('fechaIngreso', valor)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="t-chip text-negro">{textos.fotoIngreso}</p>
            <ZonaFotos
              id={`${formId}-foto-ingreso`}
              texto={textos.agregarFoto}
              archivos={formulario.fotoIngreso ? [formulario.fotoIngreso] : []}
              onArchivos={(archivos) => actualizar('fotoIngreso', archivos[0] ?? null)}
              existentes={ingresoExistente}
              onQuitarExistente={() => {
                setFotoIngresoUrl(null);
                setQuitarIngreso(true);
              }}
            />
            {errores.fotoIngreso ? (
              <p className="t-small text-naranja" role="alert">
                {errores.fotoIngreso}
              </p>
            ) : null}
          </div>
          <Interruptor
            id={`${formId}-adoptado`}
            etiqueta={textos.yaAdoptado}
            nota={textos.yaAdoptadoNota}
            activo={formulario.adoptado}
            onChange={cambiarAdopcion}
          />
          {formulario.adoptado ? (
            <div className="flex flex-col gap-4 border-t border-linea pt-5">
              <div className="flex flex-col gap-1">
                <p className="t-nav font-semibold text-negro">{textos.datosAdopcion}</p>
                <p className="flex items-center gap-1.5 t-small text-negro">
                  <Lock className="size-4" aria-hidden="true" />
                  {textos.notaPrivada}
                </p>
              </div>
              <div className={pantallaCompleta ? 'flex flex-col gap-5' : 'flex items-start gap-4'}>
                <div className="min-w-0 flex-1">
                  <CampoTexto
                    id={`${formId}-adoptante`}
                    etiqueta={textos.adoptadoPor}
                    valor={formulario.adoptadoPor}
                    placeholder={textos.adoptadoPorPlaceholder}
                    icono={<User className="size-4" aria-hidden="true" />}
                    error={errores.adoptadoPor}
                    deshabilitado={guardando}
                    onChange={(valor) => actualizar('adoptadoPor', valor)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <CampoTexto
                    id={`${formId}-direccion`}
                    etiqueta={textos.direccion}
                    valor={formulario.direccionAdoptante}
                    placeholder={textos.direccionPlaceholder}
                    icono={<MapPin className="size-4" aria-hidden="true" />}
                    error={errores.direccionAdoptante}
                    deshabilitado={guardando}
                    onChange={(valor) => actualizar('direccionAdoptante', valor)}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="t-chip text-negro">{textos.fotoAdopcion}</p>
                <ZonaFotos
                  id={`${formId}-foto-adopcion`}
                  texto={textos.agregarFotoAdopcion}
                  archivos={formulario.fotoAdopcion ? [formulario.fotoAdopcion] : []}
                  onArchivos={(archivos) => actualizar('fotoAdopcion', archivos[0] ?? null)}
                  existentes={adopcionExistente}
                  onQuitarExistente={() => {
                    setFotoAdopcionUrl(null);
                    setQuitarAdopcion(true);
                  }}
                />
                {errores.fotoAdopcion ? (
                  <p className="t-small text-naranja" role="alert">
                    {errores.fotoAdopcion}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {pantallaCompleta && edicion && animal ? (
            <div className="border-linea flex flex-col gap-3 border-t pt-5">
              <p className="t-chip text-negro">{textos.zonaPeligro}</p>
              <p className="t-small text-negro">{textos.zonaPeligroNota}</p>
              <BotonPildora
                variante="peligro"
                className="h-(--size-control-admin) w-full gap-2"
                disabled={guardando}
                onClick={() => setConfirmar(true)}
              >
                <Trash2 className="size-5" aria-hidden="true" />
                {textos.eliminar}
              </BotonPildora>
            </div>
          ) : null}
        </form>
      </Marco>
      {descartar ? (
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
            <button
              type="button"
              className="bg-velo absolute inset-0"
              aria-label={textos.seguirEditando}
              onClick={() => setDescartar(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${formId}-descartar`}
              className="border-negro bg-blanco relative flex w-full max-w-sm flex-col gap-4 rounded-admin border p-6"
            >
              <h2 id={`${formId}-descartar`} className="t-pantalla-movil text-negro">
                {textos.descartarTitulo}
              </h2>
              <p className="t-control text-negro">{textos.descartarCuerpo}</p>
              <BotonPildora onClick={() => setDescartar(false)}>{textos.seguirEditando}</BotonPildora>
              <BotonPildora variante="ghost" onClick={onCerrar}>
                {textos.descartar}
              </BotonPildora>
            </div>
          </div>,
          document.body,
        )
      ) : null}
      {confirmar && animal && pantallaCompleta ? (
        <ConfirmacionEliminarMovil
          titulo={textosAdmin.supuestos.confirmarEliminarTitulo}
          cuerpo={textosAdmin.supuestos.confirmarEliminar}
          accion={textosAdmin.supuestos.confirmarEliminarAccion}
          cancelar={textos.cancelar}
          borrando={borrando}
          error={errorBorrado}
          onCancelar={() => setConfirmar(false)}
          onConfirmar={() => void eliminar()}
        />
      ) : null}
      {confirmar && !pantallaCompleta ? (
        <ConfirmarEliminarModal
          titulo={textosAdmin.supuestos.confirmarEliminarTitulo}
          accion={textosAdmin.supuestos.confirmarEliminarAccion}
          borrando={borrando}
          error={errorBorrado}
          onCancelar={() => setConfirmar(false)}
          onConfirmar={() => void eliminar()}
        />
      ) : null}
    </>
  );
}
