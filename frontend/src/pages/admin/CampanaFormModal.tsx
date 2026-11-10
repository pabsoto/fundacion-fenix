import { useId, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { validarCampana, type CampanaFormulario, type ErroresCampana } from '@/schemas/campana';
import { guardarCampana, subirFotosCampana } from '@/services/admin/campanas.service';
import type { CampanaConTotales } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { CampoTexto } from '@/components/admin/ui/CampoTexto';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';
import { ZonaFotos, type FotoExistente } from '@/components/admin/ui/ZonaFotos';

type FotoGuardada = {
  clave: string;
  valor: string;
};

type CampanaFormModalProps = {
  campana: CampanaConTotales | null;
  onCerrar: () => void;
  onGuardada: (id: string, fotosFallidas: File[] | null) => void;
};

const VACIO: CampanaFormulario = {
  titulo: '',
  lugar: '',
  fecha: '',
  descripcion: '',
  perrosMachos: '',
  perrosHembras: '',
  gatosMachos: '',
  gatosHembras: '',
  fotos: [],
};

function formularioDe(campana: CampanaConTotales | null): CampanaFormulario {
  if (!campana) return VACIO;
  return {
    titulo: campana.titulo,
    lugar: campana.lugar ?? '',
    fecha: campana.fecha,
    descripcion: campana.descripcion ?? '',
    perrosMachos: String(campana.perrosMachos),
    perrosHembras: String(campana.perrosHembras),
    gatosMachos: String(campana.gatosMachos),
    gatosHembras: String(campana.gatosHembras),
    fotos: [],
  };
}

function fotosDe(campana: CampanaConTotales | null): FotoGuardada[] {
  if (!campana) return [];
  return campana.fotos.map((valor, indice) => ({ clave: `${indice}-${valor}`, valor }));
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

function sumaContadores(valores: string[]): number {
  return valores.reduce((total, valor) => {
    const limpio = valor.trim();
    if (!/^\d+$/.test(limpio)) return total;
    const numero = Number(limpio);
    if (numero > 100000) return total;
    return total + numero;
  }, 0);
}

export function CampanaFormModal({ campana, onCerrar, onGuardada }: CampanaFormModalProps) {
  const textos = textosAdmin.nuevaCampana;
  const formId = useId();
  const [formulario, setFormulario] = useState<CampanaFormulario>(() => formularioDe(campana));
  const [guardadas, setGuardadas] = useState<FotoGuardada[]>(() => fotosDe(campana));
  const [errores, setErrores] = useState<ErroresCampana>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const edicion = campana !== null;
  const total = sumaContadores([
    formulario.perrosMachos,
    formulario.perrosHembras,
    formulario.gatosMachos,
    formulario.gatosHembras,
  ]);

  function actualizar(campo: keyof CampanaFormulario, valor: string) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
  }

  function cerrar() {
    if (guardando) return;
    onCerrar();
  }

  async function guardar() {
    if (guardando) return;
    const resultado = validarCampana(formulario);
    if (!resultado.ok) {
      setErrores(resultado.errores);
      setErrorGeneral(null);
      return;
    }

    setErrores({});
    setErrorGeneral(null);
    setGuardando(true);
    try {
      const guardada = await guardarCampana(
        formulario,
        campana?.id,
        guardadas.map((foto) => foto.valor),
      );
      let fotosFallidas: File[] | null = null;
      if (formulario.fotos.length > 0) {
        try {
          await subirFotosCampana(guardada.id, formulario.fotos);
        } catch {
          fotosFallidas = formulario.fotos;
        }
      }
      onGuardada(guardada.id, fotosFallidas);
    } catch {
      setErrorGeneral(textosAdmin.supuestos.error);
      setGuardando(false);
    }
  }

  const existentes: FotoExistente[] = guardadas.map((foto) => ({
    clave: foto.clave,
    src: fuenteVisible(foto.valor),
    nombre: textosAdmin.campanas.foto,
  }));

  return (
    <ModalAdmin
      abierto
      titulo={edicion ? textos.editarTitulo : textos.titulo}
      subtitulo={textos.subtitulo}
      onCerrar={cerrar}
      pie={
        <>
          <BotonPildora variante="ghost" disabled={guardando} onClick={cerrar}>
            {textos.cancelar}
          </BotonPildora>
          <BotonPildora type="submit" form={formId} disabled={guardando} aria-busy={guardando}>
            {guardando ? textosAdmin.supuestos.guardando : edicion ? textos.guardarCambios : textos.guardar}
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
        <CampoTexto
          id={`${formId}-titulo`}
          etiqueta={textos.tituloCampo}
          valor={formulario.titulo}
          placeholder={textos.tituloPlaceholder}
          error={errores.titulo}
          deshabilitado={guardando}
          onChange={(valor) => actualizar('titulo', valor)}
        />
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-lugar`}
              etiqueta={textos.lugar}
              valor={formulario.lugar}
              placeholder={textos.lugarPlaceholder}
              error={errores.lugar}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('lugar', valor)}
            />
          </div>
          <div className="w-fecha-campo shrink-0">
            <CampoTexto
              id={`${formId}-fecha`}
              etiqueta={textos.fecha}
              tipo="date"
              idioma="es"
              valor={formulario.fecha}
              placeholder={textos.fechaPlaceholder}
              icono={<Calendar className="size-4" aria-hidden="true" />}
              error={errores.fecha}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('fecha', valor)}
            />
          </div>
        </div>
        <CampoTexto
          id={`${formId}-descripcion`}
          etiqueta={textos.descripcion}
          valor={formulario.descripcion}
          placeholder={textos.descripcionPlaceholder}
          multilinea
          error={errores.descripcion}
          deshabilitado={guardando}
          onChange={(valor) => actualizar('descripcion', valor)}
        />
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-perros-machos`}
              etiqueta={textos.perrosMachos}
              tipo="number"
              valor={formulario.perrosMachos}
              placeholder={textos.contadorPlaceholder}
              error={errores.perrosMachos}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('perrosMachos', valor)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-perros-hembras`}
              etiqueta={textos.perrosHembras}
              tipo="number"
              valor={formulario.perrosHembras}
              placeholder={textos.contadorPlaceholder}
              error={errores.perrosHembras}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('perrosHembras', valor)}
            />
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-gatos-machos`}
              etiqueta={textos.gatosMachos}
              tipo="number"
              valor={formulario.gatosMachos}
              placeholder={textos.contadorPlaceholder}
              error={errores.gatosMachos}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('gatosMachos', valor)}
            />
          </div>
          <div className="min-w-0 flex-1">
            <CampoTexto
              id={`${formId}-gatos-hembras`}
              etiqueta={textos.gatosHembras}
              tipo="number"
              valor={formulario.gatosHembras}
              placeholder={textos.contadorPlaceholder}
              error={errores.gatosHembras}
              deshabilitado={guardando}
              onChange={(valor) => actualizar('gatosHembras', valor)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-btn bg-crema-tono px-5 py-3.5">
          <div className="flex flex-col gap-0.5">
            <p className="t-nav text-negro">{textos.total}</p>
            <p className="t-small text-negro">{textos.totalNota}</p>
          </div>
          <p className="t-total-vivo text-negro" aria-live="polite">
            {formatNumber(total, 'es')}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-btn border border-linea px-5 py-3.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="t-nav text-negro">{textos.ingles}</p>
            <p className="t-small text-negro">{textos.inglesNota}</p>
          </div>
          <ChevronDown className="size-5 shrink-0 text-negro" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="t-chip text-negro">{textos.fotos}</p>
          <ZonaFotos
            id={`${formId}-fotos`}
            texto={textos.agregarFotos}
            multiple
            variante="mosaico"
            archivos={formulario.fotos}
            onArchivos={(fotos) => setFormulario((actual) => ({ ...actual, fotos }))}
            existentes={existentes}
            onQuitarExistente={(clave) =>
              setGuardadas((actuales) => actuales.filter((foto) => foto.clave !== clave))
            }
            nota={textos.notaFotos}
          />
          {errores.fotos ? (
            <p className="t-small text-naranja" role="alert">
              {errores.fotos}
            </p>
          ) : null}
        </div>
      </form>
    </ModalAdmin>
  );
}
