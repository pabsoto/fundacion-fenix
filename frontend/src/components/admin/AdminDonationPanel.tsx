import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, ChevronDown, CircleAlert, Lock, X } from 'lucide-react';
import { textosAdmin } from '@/content/textos-admin';
import { useVistaMovil } from '@/hooks/useVistaMovil';
import { cn } from '@/lib/cn';
import { estadoVigenciaQr, type ResultadoVigenciaQr } from '@/lib/vigencia-qr';
import { MAXIMO_QR_BYTES, MAXIMO_QR_MB } from '@/schemas/imagen';
import { validarDonacion, type DonacionFormulario, type ErroresDonacion } from '@/schemas/donacion';
import {
  deleteDonationQr,
  getAdminDonation,
  saveAdminDonation,
  uploadDonationQr,
  type AdminDonation,
  type SaveAdminDonation,
} from '@/services/admin-donations.service';
import { isDemoDonation } from '@/services/donations.service';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { CampoTexto } from '@/components/admin/ui/CampoTexto';
import { Interruptor } from '@/components/admin/ui/Interruptor';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';
import { ZonaFotos } from '@/components/admin/ui/ZonaFotos';
import { Card } from '@/components/ui/Card';
import { Photo } from '@/components/ui/Photo';

type Borrador = DonacionFormulario & {
  activo: boolean;
  qrVenceEl: string;
};

type Modal = 'qr' | 'ocultar' | 'descartar';

type Pendiente = {
  datos: SaveAdminDonation;
  archivo: File | null;
};

type QrPendiente = {
  archivo: File;
  venceEl: string;
};

const VACIO: Borrador = {
  titular: '',
  banco: '',
  telefono: '',
  referencia: '',
  numeroCuenta: '',
  avisoEs: '',
  avisoEn: '',
  activo: true,
  qrVenceEl: '',
};

const CLAVES = Object.keys(VACIO) as (keyof Borrador)[];

export const AVISO_EXITO_MS = 5000;
export const AVISO_ENTRADA_MS = 280;
export const AVISO_SALIDA_MS = 240;

function mismo(a: Borrador, b: Borrador): boolean {
  return CLAVES.every((clave) => a[clave] === b[clave]);
}

function borradorDe(donacion: AdminDonation): Borrador {
  return {
    titular: donacion.titular,
    banco: donacion.banco,
    telefono: donacion.telefono,
    referencia: donacion.referencia,
    numeroCuenta: donacion.numeroCuenta ?? '',
    avisoEs: donacion.avisoEs ?? '',
    avisoEn: donacion.avisoEn ?? '',
    activo: donacion.activo,
    qrVenceEl: donacion.qr.venceEl ?? '',
  };
}

function fechaCortaDia(iso: string): string {
  const textos = textosAdmin.donaciones;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!partes) return iso;
  const anio = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const nombre = textos.meses[mes - 1];
  if (!nombre || !dia) return iso;
  return textos.fechaCorta(dia, nombre, anio);
}

function textoVigencia(vigencia: ResultadoVigenciaQr): string {
  const textos = textosAdmin.donaciones;
  if (vigencia.estado === 'sin-qr') return textos.sinQr;
  if (vigencia.estado === 'vencido') return textos.vencido;
  if (!vigencia.fecha) return textos.sinFechaVencimiento;
  return textos.venceElFecha(fechaCortaDia(vigencia.fecha));
}

function fechaVisible(iso: string | null): string {
  const textos = textosAdmin.donaciones;
  if (!iso) return textos.sinFecha;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return textos.sinFecha;
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(fecha);
  const [anio, mes, dia] = partes.split('-').map(Number);
  const nombre = mes ? textos.meses[mes - 1] : undefined;
  if (!anio || !dia || !nombre) return textos.sinFecha;
  return textos.fechaCorta(dia, nombre, anio);
}

function cuerpoDe(borrador: Borrador, datos: SaveAdminDonation): SaveAdminDonation {
  const fecha = borrador.qrVenceEl.trim();
  return {
    ...datos,
    activo: borrador.activo,
    qrVenceEl: fecha ? fecha : null,
  };
}

export function AdminDonationPanel({ csrfToken }: { csrfToken: string }) {
  const textos = textosAdmin.donaciones;
  const supuestos = textosAdmin.supuestos;
  const movil = useVistaMovil();
  const queryClient = useQueryClient();
  const enviando = useRef(false);
  const pendiente = useRef<Pendiente | null>(null);

  const [carga, setCarga] = useState<'cargando' | 'listo' | 'error'>('cargando');
  const [intento, setIntento] = useState(0);
  const [formulario, setFormulario] = useState<Borrador>(VACIO);
  const [base, setBase] = useState<Borrador>(VACIO);
  const [actualizadoEn, setActualizadoEn] = useState<string | null>(null);
  const [qrDisponible, setQrDisponible] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [urlLocal, setUrlLocal] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const [errores, setErrores] = useState<ErroresDonacion>({});
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [english, setEnglish] = useState(false);
  const [exito, setExito] = useState<string | null>(null);
  const [saliendo, setSaliendo] = useState(false);
  const [marcaExito, setMarcaExito] = useState(0);
  const exitoRef = useRef<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [reintento, setReintento] = useState<'guardar' | 'quitar' | null>(null);
  const [qrPendiente, setQrPendiente] = useState<QrPendiente | null>(null);

  const retirarExito = useCallback(() => {
    if (exitoRef.current) setSaliendo(true);
  }, []);

  const fijarArchivo = useCallback((siguiente: File | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const creada = siguiente ? URL.createObjectURL(siguiente) : null;
    urlRef.current = creada;
    setUrlLocal(creada);
    setArchivo(siguiente);
    retirarExito();
  }, [retirarExito]);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!movil) return;
    const raiz = document.documentElement;
    const relleno = raiz.style.scrollPaddingBottom;
    raiz.style.scrollPaddingBottom =
      'calc(var(--spacing-contenido-bajo-barra) + env(safe-area-inset-bottom, 0px))';

    function desplazar(objetivo: EventTarget | null) {
      if (!(objetivo instanceof HTMLElement)) return;
      if (objetivo.tagName !== 'INPUT' && objetivo.tagName !== 'TEXTAREA') return;
      objetivo.scrollIntoView({ block: 'center', inline: 'nearest' });
    }

    function alFoco(event: FocusEvent) {
      desplazar(event.target);
    }

    function alViewport() {
      desplazar(document.activeElement);
    }

    document.addEventListener('focusin', alFoco);
    window.visualViewport?.addEventListener('resize', alViewport);
    return () => {
      raiz.style.scrollPaddingBottom = relleno;
      document.removeEventListener('focusin', alFoco);
      window.visualViewport?.removeEventListener('resize', alViewport);
    };
  }, [movil]);

  const aplicarDonacion = useCallback((donacion: AdminDonation) => {
    const siguiente = borradorDe(donacion);
    setFormulario(siguiente);
    setBase(siguiente);
    setActualizadoEn(donacion.actualizadoEn);
    setQrDisponible(donacion.qr.disponible);
    setQrUrl(donacion.qrUrl);
  }, []);

  useEffect(() => {
    let vivo = true;
    void getAdminDonation()
      .then((donacion) => {
        if (!vivo) return;
        if (!donacion) {
          // TODO(backend): si el GET admin llegara a devolver la configuración inactiva, quitar este aviso.
          setFormulario(VACIO);
          setBase(VACIO);
          setActualizadoEn(null);
          setQrDisponible(false);
          setQrUrl(null);
        } else {
          aplicarDonacion(donacion);
        }
        fijarArchivo(null);
        setErrores({});
        setCarga('listo');
      })
      .catch(() => {
        if (vivo) setCarga('error');
      });
    return () => {
      vivo = false;
    };
  }, [intento, aplicarDonacion, fijarArchivo]);

  useEffect(() => {
    exitoRef.current = exito;
  }, [exito]);

  useEffect(() => {
    if (!exito || saliendo) return;
    const temporizador = window.setTimeout(() => setSaliendo(true), AVISO_EXITO_MS);
    return () => window.clearTimeout(temporizador);
  }, [exito, marcaExito, saliendo]);

  useEffect(() => {
    if (!saliendo) return;
    const temporizador = window.setTimeout(() => {
      exitoRef.current = null;
      setExito(null);
      setSaliendo(false);
    }, AVISO_SALIDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [saliendo]);

  function actualizar<K extends keyof Borrador>(campo: K, valor: Borrador[K]) {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: undefined }));
    retirarExito();
  }

  function anunciarExito() {
    exitoRef.current = supuestos.guardado;
    setExito(supuestos.guardado);
    setSaliendo(false);
    setMarcaExito((marca) => marca + 1);
  }

  async function invalidar() {
    await queryClient.invalidateQueries({ queryKey: ['public-donation'] });
  }

  async function enviar(pedido: Pendiente) {
    if (enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    setModal(null);
    retirarExito();
    setFallo(null);
    setReintento(null);
    try {
      const guardada = await saveAdminDonation(pedido.datos, csrfToken);
      await invalidar();
      let qrSubido = false;
      if (pedido.archivo && pedido.datos.activo !== false) {
        try {
          await uploadDonationQr(pedido.archivo, pedido.datos.qrVenceEl ?? '', csrfToken);
          await invalidar();
          qrSubido = true;
          setQrPendiente(null);
        } catch {
          setQrPendiente({
            archivo: pedido.archivo,
            venceEl: pedido.datos.qrVenceEl ?? '',
          });
          setFallo(supuestos.qrNoSubio);
        }
      } else {
        setQrPendiente(null);
      }

      if (pedido.datos.activo === false) {
        setFormulario(VACIO);
        setBase(VACIO);
        setActualizadoEn(null);
        setQrDisponible(false);
        setQrUrl(null);
      } else {
        let origen = guardada;
        try {
          const fresca = await getAdminDonation();
          if (fresca) origen = fresca;
        } catch {
          // TODO(backend): si el GET posterior al guardado falla, se usa la respuesta del PUT.
        }
        aplicarDonacion(origen);
        if (qrSubido) setQrDisponible(true);
      }
      fijarArchivo(null);
      if (!pedido.archivo || qrSubido || pedido.datos.activo === false) {
        anunciarExito();
      }
    } catch (error) {
      pendiente.current = pedido;
      setReintento('guardar');
      setFallo(error instanceof Error && error.message ? error.message : supuestos.noGuardado);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  function solicitar() {
    if (enviando.current) return;
    const resultado = validarDonacion(formulario);
    if (!resultado.ok) {
      setErrores(resultado.errores);
      retirarExito();
      return;
    }
    setErrores({});
    const datos = cuerpoDe(formulario, resultado.datos);
    const pedido: Pendiente = {
      datos,
      archivo: formulario.activo ? archivo : null,
    };
    pendiente.current = pedido;
    if (!formulario.activo) {
      setModal('ocultar');
      return;
    }
    if (archivo) {
      setModal('qr');
      return;
    }
    void enviar(pedido);
  }

  function confirmarModal() {
    if (modal === 'descartar') {
      setFormulario(base);
      fijarArchivo(null);
      setErrores({});
      setModal(null);
      return;
    }
    const pedido = pendiente.current;
    if (!pedido || enviando.current) return;
    void enviar(pedido);
  }

  async function reintentarQr() {
    if (!qrPendiente || enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    setFallo(null);
    try {
      await uploadDonationQr(qrPendiente.archivo, qrPendiente.venceEl, csrfToken);
      await invalidar();
      setQrPendiente(null);
      try {
        const fresca = await getAdminDonation();
        if (fresca) {
          setQrUrl(fresca.qrUrl);
          setQrDisponible(fresca.qr.disponible);
          setActualizadoEn(fresca.actualizadoEn);
        } else {
          setQrDisponible(true);
        }
      } catch {
        // TODO(backend): si el GET posterior a la subida falla, no hay qrUrl nuevo que mostrar.
        setQrDisponible(true);
      }
      anunciarExito();
    } catch {
      setFallo(supuestos.qrNoSubio);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  async function quitarQr() {
    if (enviando.current) return;
    enviando.current = true;
    setGuardando(true);
    retirarExito();
    setFallo(null);
    setReintento(null);
    try {
      await deleteDonationQr(csrfToken);
      await invalidar();
      setQrDisponible(false);
      setQrUrl(null);
      anunciarExito();
    } catch (error) {
      setReintento('quitar');
      setFallo(error instanceof Error && error.message ? error.message : supuestos.noQuitoQr);
    } finally {
      enviando.current = false;
      setGuardando(false);
    }
  }

  const sucio = !mismo(formulario, base) || archivo !== null;
  const hayQr = archivo !== null || Boolean(qrUrl) || qrDisponible;
  const vigencia = estadoVigenciaQr(formulario.qrVenceEl.trim() ? formulario.qrVenceEl : null, hayQr);
  const textoEstado = textoVigencia(vigencia);
  const rotulo = archivo ? textos.qrNuevo : qrUrl ? textos.qrActual : null;
  const srcPrevia = archivo ? urlLocal : qrUrl;
  const demo = isDemoDonation({
    titular: formulario.titular,
    banco: formulario.banco,
    telefono: formulario.telefono,
    referencia: formulario.referencia,
    numeroCuenta: formulario.numeroCuenta.trim() ? formulario.numeroCuenta : null,
    aviso: { es: formulario.avisoEs, en: formulario.avisoEn },
    qrUrl: null,
  });
  const modalTexto =
    modal === 'qr'
      ? { titulo: supuestos.confirmarQrTitulo, cuerpo: supuestos.confirmarQr }
      : modal === 'ocultar'
        ? { titulo: supuestos.ocultarDonacionTitulo, cuerpo: supuestos.ocultarDonacion }
        : modal === 'descartar'
          ? { titulo: supuestos.descartarTitulo, cuerpo: supuestos.descartarCambios }
          : null;

  const campoTitular = (
    <CampoTexto
      id="donacion-titular"
      etiqueta={textos.titular}
      valor={formulario.titular}
      error={errores.titular}
      deshabilitado={guardando}
      toque={movil}
      onChange={(valor) => actualizar('titular', valor)}
    />
  );
  const campoBanco = (
    <CampoTexto
      id="donacion-banco"
      etiqueta={textos.banco}
      valor={formulario.banco}
      error={errores.banco}
      deshabilitado={guardando}
      toque={movil}
      onChange={(valor) => actualizar('banco', valor)}
    />
  );
  const campoTelefono = (
    <CampoTexto
      id="donacion-telefono"
      etiqueta={textos.telefono}
      valor={formulario.telefono}
      error={errores.telefono}
      deshabilitado={guardando}
      inputMode={movil ? 'tel' : undefined}
      toque={movil}
      onChange={(valor) => actualizar('telefono', valor)}
    />
  );
  const campoReferencia = (
    <CampoTexto
      id="donacion-referencia"
      etiqueta={textos.referencia}
      valor={formulario.referencia}
      error={errores.referencia}
      deshabilitado={guardando}
      toque={movil}
      onChange={(valor) => actualizar('referencia', valor)}
    />
  );
  const campoCuenta = (
    <CampoTexto
      id="donacion-cuenta"
      etiqueta={textos.numeroCuenta}
      valor={formulario.numeroCuenta}
      placeholder={textos.placeholderCuenta}
      deshabilitado={guardando}
      toque={movil}
      onChange={(valor) => actualizar('numeroCuenta', valor)}
    />
  );
  const campoVence = (
    <div className="flex min-w-0 flex-col gap-2">
      <CampoTexto
        id="donacion-vence"
        etiqueta={textos.vence}
        tipo="date"
        idioma="es"
        valor={formulario.qrVenceEl}
        icono={<Calendar className="size-4" aria-hidden="true" />}
        deshabilitado={guardando}
        toque={movil}
        onChange={(valor) => actualizar('qrVenceEl', valor)}
      />
      <p className="flex items-center gap-2 t-small text-negro">
        {vigencia.estado === 'vigente' ? (
          <Calendar className="size-4 shrink-0" aria-hidden="true" />
        ) : (
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        )}
        {textoEstado}
      </p>
    </div>
  );
  const zonaQr = (
    <ZonaFotos
      id="donacion-qr"
      variante="qr"
      texto={textos.cambiarImagen}
      nota={textos.notaQr(MAXIMO_QR_MB)}
      maximoBytes={MAXIMO_QR_BYTES}
      mensajeInvalido={textos.imagenInvalida(MAXIMO_QR_MB)}
      archivos={archivo ? [archivo] : []}
      onArchivos={(archivos) => fijarArchivo(archivos[0] ?? null)}
      existentes={
        !archivo && (qrUrl || qrDisponible)
          ? [{ clave: 'qr', src: qrUrl, nombre: textos.qrActual }]
          : []
      }
      onQuitarExistente={() => void quitarQr()}
      toque={movil}
    />
  );
  const campoAviso = (
    <CampoTexto
      id="donacion-aviso"
      etiqueta={textos.aviso}
      valor={formulario.avisoEs}
      multilinea
      deshabilitado={guardando}
      toque={movil}
      onChange={(valor) => actualizar('avisoEs', valor)}
    />
  );
  const bloqueEnglish = (
    <div className="rounded-btn border border-linea">
      <button
        type="button"
        className={
          movil
            ? 'flex min-h-(--size-toque-admin) w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left'
            : 'flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left'
        }
        aria-expanded={english}
        aria-controls={english ? 'donacion-english' : undefined}
        onClick={() => setEnglish((abierto) => !abierto)}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="t-nav text-negro">{textos.english}</span>
          <span className="t-small text-texto-secundario">{textos.englishNota}</span>
        </span>
        <ChevronDown
          className={cn('size-5 shrink-0 text-negro', english && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      {english ? (
        <div id="donacion-english" className="px-5 pb-4">
          <CampoTexto
            id="donacion-aviso-en"
            etiqueta={textos.avisoEn}
            valor={formulario.avisoEn}
            idioma="en"
            multilinea
            deshabilitado={guardando}
            toque={movil}
            onChange={(valor) => actualizar('avisoEn', valor)}
          />
        </div>
      ) : null}
    </div>
  );
  const botonDescartar = (
    <BotonPildora
      variante="ghost"
      className={movil ? 'h-(--size-control-admin) min-w-0 flex-1' : undefined}
      disabled={guardando}
      onClick={() => {
        if (sucio) setModal('descartar');
      }}
    >
      {textos.descartar}
    </BotonPildora>
  );
  const botonGuardar = (
    <BotonPildora
      type="submit"
      className={movil ? 'h-(--size-control-admin) min-w-0 flex-1' : undefined}
      disabled={guardando}
      aria-busy={guardando}
    >
      {textos.guardar}
    </BotonPildora>
  );
  const vista = (
    <VistaPrevia
      movil={movil}
      titular={formulario.titular}
      banco={formulario.banco}
      telefono={formulario.telefono}
      referencia={formulario.referencia}
      aviso={formulario.avisoEs}
      activo={formulario.activo}
      src={srcPrevia}
      rotulo={rotulo}
      mostrarQr={vigencia.estado === 'vigente' && Boolean(srcPrevia)}
    />
  );

  return (
    <div
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        movil ? 'gap-(--spacing-card-gap-movil)' : 'gap-(--spacing-bloque-gap-admin)',
      )}
    >
      <header className="flex flex-col gap-(--spacing-titulo-pagina-admin)">
        <h1 className={cn(movil ? 't-pagina-movil' : 't-pagina', 'text-negro')}>{textos.titulo}</h1>
        <p className={cn(movil ? 't-control' : 't-subtitulo', 'text-texto-secundario')}>
          {movil ? textos.subtituloMovil : textos.subtitulo}
        </p>
      </header>

      {qrPendiente ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="t-small text-negro">{supuestos.qrNoSubio}</p>
          <BotonPildora
            variante="ghost"
            disabled={guardando}
            aria-busy={guardando}
            onClick={() => void reintentarQr()}
          >
            {supuestos.reintentar}
          </BotonPildora>
        </div>
      ) : null}

      {fallo && !qrPendiente ? (
        <div className="flex flex-wrap items-center gap-3" role="alert">
          <p className="t-small text-negro">{fallo}</p>
          {reintento ? (
            <BotonPildora
              variante="ghost"
              disabled={guardando}
              onClick={() => {
                if (reintento === 'quitar') {
                  void quitarQr();
                  return;
                }
                const pedido = pendiente.current;
                if (pedido) void enviar(pedido);
              }}
            >
              {supuestos.reintentar}
            </BotonPildora>
          ) : null}
        </div>
      ) : null}

      {carga === 'cargando' ? (
        <Card
          radius="admin"
          elevated="panel"
          className="flex min-h-(--size-panel-vacio-admin) min-w-0"
          aria-busy="true"
        >
          <p className="sr-only">{supuestos.cargando}</p>
          <div className="flex min-w-0 flex-1 flex-col gap-3 p-7">
            <div className="h-(--size-control-admin) animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
            <div className="h-fila-admin animate-pulse rounded-btn bg-crema-tono" />
          </div>
        </Card>
      ) : null}

      {carga === 'error' ? (
        <Card radius="admin" elevated="panel" className="flex flex-col items-start gap-4 p-7">
          <p className="t-control text-negro" role="alert">
            {supuestos.error}
          </p>
          <BotonPildora
            onClick={() => {
              setCarga('cargando');
              setIntento((valor) => valor + 1);
            }}
          >
            {supuestos.reintentar}
          </BotonPildora>
        </Card>
      ) : null}

      {carga === 'listo' ? (
        movil ? (
          <form
            className="flex min-w-0 flex-col gap-(--spacing-card-gap-movil)"
            onSubmit={(event) => {
              event.preventDefault();
              solicitar();
            }}
            noValidate
          >
            {vigencia.estado !== 'vigente' ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-card border border-linea bg-crema-tono px-5 py-4"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
                <p className="t-small text-negro">{textoEstado}</p>
              </div>
            ) : null}

            {demo ? (
              <div
                role="status"
                className="flex items-start gap-3 rounded-card border border-linea bg-crema-tono px-5 py-4"
              >
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
                <p className="t-small text-negro">{textos.demoAviso}</p>
              </div>
            ) : null}

            <SeccionMovil titulo={textos.cuenta} nota={textos.cuentaNotaMovil}>
              <Interruptor
                id="donacion-activo"
                etiqueta={textos.mostrar}
                nota={textos.mostrarNota}
                activo={formulario.activo}
                onChange={(activo) => actualizar('activo', activo)}
              />
              {campoTitular}
              {campoBanco}
              {campoTelefono}
              {campoReferencia}
              {campoCuenta}
            </SeccionMovil>

            <SeccionMovil titulo={textos.codigoQr} nota={textos.qrSeccionNota}>
              <div className="flex min-w-0 flex-col gap-2">
                <p className="t-chip text-negro">{textos.imagenQr}</p>
                {zonaQr}
                {rotulo ? <p className="t-small text-texto-secundario">{rotulo}</p> : null}
              </div>
              {campoVence}
            </SeccionMovil>

            <SeccionMovil titulo={textos.avisoSeccion} nota={textos.avisoSeccionNota}>
              {campoAviso}
              {bloqueEnglish}
            </SeccionMovil>

            <SeccionMovil titulo={textos.vistaSeccion} nota={textos.vistaNotaMovil}>
              {vista}
            </SeccionMovil>

            <div className="flex gap-3">
              {botonDescartar}
              {botonGuardar}
            </div>
            <p className="t-small text-center text-texto-secundario">
              {textos.ultimaActualizacion(fechaVisible(actualizadoEn))}
            </p>
          </form>
        ) : (
          <Card radius="admin" elevated="panel" className="flex min-w-0 items-stretch overflow-hidden">
            <form
              className="flex min-w-0 flex-1 flex-col gap-5 p-7"
              onSubmit={(event) => {
                event.preventDefault();
                solicitar();
              }}
              noValidate
            >
              {vigencia.estado !== 'vigente' ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-card border border-linea bg-crema-tono px-5 py-4"
                >
                  <CircleAlert className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
                  <p className="t-small text-negro">{textoEstado}</p>
                </div>
              ) : null}

              {demo ? (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-card border border-linea bg-crema-tono px-5 py-4"
                >
                  <CircleAlert className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
                  <p className="t-small text-negro">{textos.demoAviso}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-1">
                <h2 className="t-cuenta text-negro">{textos.cuenta}</h2>
                <p className="t-control text-texto-secundario">{textos.cuentaNota}</p>
              </div>

              <Interruptor
                id="donacion-activo"
                etiqueta={textos.mostrar}
                nota={textos.mostrarNota}
                activo={formulario.activo}
                onChange={(activo) => actualizar('activo', activo)}
              />

              <div className="grid grid-cols-2 gap-4">
                {campoTitular}
                {campoBanco}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {campoTelefono}
                {campoReferencia}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {campoCuenta}
                {campoVence}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="t-chip text-negro">{textos.qr}</p>
                  {rotulo ? <p className="t-small text-texto-secundario">{rotulo}</p> : null}
                </div>
                {zonaQr}
              </div>

              {campoAviso}
              {bloqueEnglish}

              <div className="flex items-center justify-between gap-4 border-t border-linea pt-5">
                <p className="t-small text-texto-secundario">
                  {textos.ultimaActualizacion(fechaVisible(actualizadoEn))}
                </p>
                <div className="flex shrink-0 gap-3">
                  {botonDescartar}
                  {botonGuardar}
                </div>
              </div>
            </form>
            {vista}
          </Card>
        )
      ) : null}

      {exito ? (
        <div
          key={marcaExito}
          role="status"
          className={cn(
            movil
              ? 'aviso-exito t-nav fixed left-1/2 flex max-w-[calc(100vw-2*var(--spacing-pagina-admin-movil))] items-center gap-3 rounded-pill bg-negro py-2 pr-2 pl-5 text-crema bottom-[calc(var(--spacing-contenido-bajo-barra)+env(safe-area-inset-bottom,0px))]'
              : 'aviso-exito t-nav fixed bottom-6 left-1/2 flex items-center gap-3 rounded-pill bg-negro py-2 pr-2 pl-5 text-crema',
            saliendo ? 'aviso-exito-salir' : 'aviso-exito-entrar',
          )}
          style={{ animationDuration: `${saliendo ? AVISO_SALIDA_MS : AVISO_ENTRADA_MS}ms` }}
        >
          <p>{exito}</p>
          <button
            type="button"
            aria-label={textos.cerrarAviso}
            onClick={retirarExito}
            className={
              movil
                ? 'flex size-(--size-toque-admin) shrink-0 cursor-pointer items-center justify-center rounded-full text-crema'
                : 'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-crema'
            }
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {modalTexto ? (
        <ModalAdmin
          abierto
          apilado={movil}
          titulo={modalTexto.titulo}
          onCerrar={() => {
            if (!guardando) setModal(null);
          }}
          pie={
            <>
              <BotonPildora
                variante="ghost"
                className={movil ? 'h-(--size-control-admin) w-full' : undefined}
                disabled={guardando}
                onClick={() => setModal(null)}
              >
                {supuestos.cancelar}
              </BotonPildora>
              <BotonPildora
                className={movil ? 'h-(--size-control-admin) w-full' : undefined}
                disabled={guardando}
                aria-busy={guardando}
                onClick={confirmarModal}
              >
                {supuestos.confirmar}
              </BotonPildora>
            </>
          }
        >
          <p className="t-control text-negro">{modalTexto.cuerpo}</p>
        </ModalAdmin>
      ) : null}
    </div>
  );
}

function SeccionMovil({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-(--spacing-card-gap-movil) rounded-vista-donar border border-linea bg-blanco px-(--spacing-pagina-admin-movil) py-(--spacing-card-movil)">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="t-seccion-movil text-negro">{titulo}</h2>
        <p className="t-small text-texto-secundario">{nota}</p>
      </div>
      {children}
    </section>
  );
}

function VistaPrevia({
  movil = false,
  titular,
  banco,
  telefono,
  referencia,
  aviso,
  activo,
  src,
  rotulo,
  mostrarQr,
}: {
  movil?: boolean;
  titular: string;
  banco: string;
  telefono: string;
  referencia: string;
  aviso: string;
  activo: boolean;
  src: string | null;
  rotulo: string | null;
  mostrarQr: boolean;
}) {
  const textos = textosAdmin.donaciones;
  const avisoVisible = aviso.trim();
  const filas = [
    { id: 'titular', etiqueta: textos.vistaTitular, valor: titular },
    { id: 'banco', etiqueta: textos.vistaBanco, valor: banco },
    { id: 'telefono', etiqueta: textos.vistaTelefono, valor: telefono },
    { id: 'referencia', etiqueta: textos.vistaReferencia, valor: referencia },
  ];

  return (
    <aside
      className={
        movil
          ? 'flex min-w-0 flex-col gap-(--spacing-card-gap-movil)'
          : 'flex w-(--spacing-panel-detalle) shrink-0 flex-col gap-4 self-stretch border-l border-linea px-6 py-7'
      }
    >
      {movil ? null : (
        <div className="flex flex-col gap-1.5">
          <p className="t-eyebrow text-negro">{textos.vistaTitulo}</p>
          <p className="t-small text-texto-secundario">{textos.vistaNota}</p>
        </div>
      )}
      {activo ? null : (
        <div role="status" className="flex items-start gap-3 rounded-card border border-linea px-4 py-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
          <p className="t-small text-negro">{textos.noAparecera}</p>
        </div>
      )}
      <div
        className={
          movil
            ? 'flex flex-col items-center gap-5 rounded-vista-donar border border-linea bg-blanco px-(--spacing-pagina-admin-movil) py-(--spacing-card-movil) shadow-lift'
            : 'flex flex-col items-center gap-5 rounded-vista-donar border border-linea bg-blanco p-5 shadow-lift'
        }
      >
        <p className="t-heading-card text-negro">{textos.codigoQr}</p>
        {rotulo ? <p className="t-small text-texto-secundario">{rotulo}</p> : null}
        {mostrarQr && src ? (
          <Photo
            key={src}
            src={src}
            alt={rotulo ?? textos.codigoQr}
            radius="card"
            className="aspect-square h-auto w-full"
          />
        ) : (
          <div className="flex aspect-square h-auto w-full items-center justify-center rounded-card bg-linea p-8 text-center">
            <p className="t-body text-negro">{textos.cajaQrPublica}</p>
          </div>
        )}
        {mostrarQr ? null : <p className="t-small text-center text-negro">{textos.qrNoDisponible}</p>}
      </div>
      <div
        className={
          movil
            ? 'flex flex-col gap-3.5 rounded-card border border-linea bg-blanco px-(--spacing-pagina-admin-movil) py-(--spacing-card-movil) text-negro'
            : 'flex flex-col gap-3.5 rounded-card border border-linea bg-blanco p-5 text-negro'
        }
      >
        <p className="t-eyebrow">{textos.cuenta}</p>
        {filas.map((fila) => (
          <div key={fila.id} className="flex items-center justify-between gap-4">
            <p className="t-body-strong shrink-0">{fila.etiqueta}</p>
            <p className="t-body min-w-0 truncate text-right">{fila.valor}</p>
          </div>
        ))}
      </div>
      {avisoVisible ? (
        <div className="flex items-start gap-3 rounded-card bg-amarillo px-5 py-4">
          <Lock className="mt-0.5 size-5 shrink-0 text-negro" aria-hidden="true" />
          <p className="t-small text-negro">{avisoVisible}</p>
        </div>
      ) : null}
    </aside>
  );
}
