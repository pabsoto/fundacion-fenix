import { textosAdmin } from '@/content/textos-admin';
import { BotonPildora } from '@/components/admin/ui/BotonPildora';
import { ModalAdmin } from '@/components/admin/ui/ModalAdmin';

type ConfirmarEliminarModalProps = {
  titulo: string;
  /** Texto principal. Por defecto, «Esta acción no se puede deshacer.» */
  cuerpo?: string;
  /** Segunda línea opcional, por ejemplo qué se está eliminando. */
  detalle?: string;
  accion: string;
  borrando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: () => void;
};

/**
 * Confirmación de un borrado definitivo. Mientras borra no se puede cerrar,
 * y si falla muestra el error sin cerrarse para poder reintentar.
 */
export function ConfirmarEliminarModal({
  titulo,
  cuerpo = textosAdmin.supuestos.confirmarEliminar,
  detalle,
  accion,
  borrando,
  error,
  onCancelar,
  onConfirmar,
}: ConfirmarEliminarModalProps) {
  return (
    <ModalAdmin
      abierto
      titulo={titulo}
      onCerrar={() => {
        if (!borrando) onCancelar();
      }}
      pie={
        <>
          <BotonPildora variante="ghost" disabled={borrando} onClick={onCancelar}>
            {textosAdmin.supuestos.cancelar}
          </BotonPildora>
          <BotonPildora disabled={borrando} aria-busy={borrando} onClick={onConfirmar}>
            {borrando ? textosAdmin.supuestos.guardando : accion}
          </BotonPildora>
        </>
      }
    >
      {detalle ? <p className="t-control mb-2 text-negro">{detalle}</p> : null}
      <p className="t-control text-negro">{cuerpo}</p>
      {error ? (
        <p className="t-small mt-3 text-naranja" role="alert">
          {error}
        </p>
      ) : null}
    </ModalAdmin>
  );
}
