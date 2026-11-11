import { useId, useState } from 'react';
import { Calendar, Lock, MapPin, Trash2, User } from 'lucide-react';
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

export function AnimalFormModal({
  animal,
  onCerrar,
  onGuardado,
  onEliminado,
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
  const edicion = animal !== null;

  function actualizar<K extends keyof AnimalFormulario>(campo: K, valor: AnimalFormulario[K]) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function cerrar() {
    if (guardando || borrando) return;
    onCerrar();
  }

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

  return (
    <>
      <ModalAdmin
        abierto
        titulo={edicion ? textos.editarTitulo : textos.titulo}
        subtitulo={textos.subtitulo}
        onCerrar={cerrar}
        pie={
          <>
            {edicion ? (
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
            <BotonPildora type="submit" form={formId} disabled={guardando} aria-busy={guardando}>
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
          <div className="flex items-start gap-4">
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
          <div className="flex items-start gap-4">
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
          <div className="w-campo-corto max-w-full">
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
              <div className="flex items-start gap-4">
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
        </form>
      </ModalAdmin>
      {confirmar ? (
        <ModalAdmin
          abierto
          titulo={textosAdmin.supuestos.confirmarEliminarTitulo}
          onCerrar={() => {
            if (!borrando) setConfirmar(false);
          }}
          pie={
            <>
              <BotonPildora
                variante="ghost"
                disabled={borrando}
                onClick={() => setConfirmar(false)}
              >
                {textosAdmin.supuestos.cancelar}
              </BotonPildora>
              <BotonPildora disabled={borrando} aria-busy={borrando} onClick={() => void eliminar()}>
                {borrando
                  ? textosAdmin.supuestos.guardando
                  : textosAdmin.supuestos.confirmarEliminarAccion}
              </BotonPildora>
            </>
          }
        >
          <p className="t-control text-negro">{textosAdmin.supuestos.confirmarEliminar}</p>
          {errorBorrado ? (
            <p className="t-small mt-3 text-naranja" role="alert">
              {errorBorrado}
            </p>
          ) : null}
        </ModalAdmin>
      ) : null}
    </>
  );
}
