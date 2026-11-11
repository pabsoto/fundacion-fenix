import { useState } from 'react';
import { textosAdmin } from '@/content/textos-admin';
import { formatNumber } from '@/lib/format';
import { cerrarCampana, reabrirCampana } from '@/services/admin/campanas.service';
import { ErrorApiAdmin } from '@/services/admin/cliente-admin';
import type { CampanaConTotales } from '@/types/admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';

export type AccionCierre = 'cerrar' | 'reabrir';

type CierreCampanaModalProps = {
  campana: CampanaConTotales;
  accion: AccionCierre;
  onCerrar: () => void;
  onHecho: (id: string) => void;
};

/** Confirma el cierre o la reapertura de una campaña. */
export function CierreCampanaModal({
  campana,
  accion,
  onCerrar,
  onHecho,
}: CierreCampanaModalProps) {
  const textos = textosAdmin.campanas.cierre;
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cerrando = accion === 'cerrar';

  async function confirmar() {
    if (trabajando) return;
    setTrabajando(true);
    setError(null);
    try {
      await (cerrando ? cerrarCampana(campana.id) : reabrirCampana(campana.id));
      onHecho(campana.id);
    } catch (causa) {
      setError(causa instanceof ErrorApiAdmin ? causa.message : textosAdmin.supuestos.error);
      setTrabajando(false);
    }
  }

  return (
    <ModalAdmin
      abierto
      titulo={cerrando ? textos.tituloCerrar : textos.tituloReabrir}
      onCerrar={() => {
        if (!trabajando) onCerrar();
      }}
      pie={
        <>
          <BotonPildora variante="ghost" disabled={trabajando} onClick={onCerrar}>
            {textosAdmin.supuestos.cancelar}
          </BotonPildora>
          <BotonPildora disabled={trabajando} aria-busy={trabajando} onClick={() => void confirmar()}>
            {trabajando
              ? textosAdmin.supuestos.guardando
              : cerrando
                ? textos.confirmarCerrar
                : textos.confirmarReabrir}
          </BotonPildora>
        </>
      }
    >
      <p className="t-control text-negro">
        {cerrando
          ? textos.cuerpoCerrar(campana.titulo, formatNumber(campana.totales.total, 'es'))
          : textos.cuerpoReabrir(campana.titulo)}
      </p>
      {error ? (
        <p className="t-small mt-3 text-naranja" role="alert">
          {error}
        </p>
      ) : null}
    </ModalAdmin>
  );
}
