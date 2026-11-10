import { textosAdmin } from '@/content/textos-admin';
import type { SaveAdminDonation } from '@/services/admin-donations.service';

export type DonacionFormulario = {
  titular: string;
  banco: string;
  telefono: string;
  referencia: string;
  numeroCuenta: string;
  avisoEs: string;
  avisoEn: string;
};

export type ErroresDonacion = Partial<Record<keyof DonacionFormulario, string>>;

export type ResultadoDonacion =
  | { ok: true; datos: SaveAdminDonation }
  | { ok: false; errores: ErroresDonacion };

function texto(valor: string): string {
  return valor.trim();
}

/**
 * Misma forma que el formulario actual. Todavía no lo usa la pantalla:
 * Donaciones sigue guardando con su lógica de hoy.
 */
export function validarDonacion(formulario: DonacionFormulario): ResultadoDonacion {
  const errores: ErroresDonacion = {};
  const titular = texto(formulario.titular);
  const banco = texto(formulario.banco);
  const telefono = texto(formulario.telefono);
  const referencia = texto(formulario.referencia);
  if (!titular) errores.titular = textosAdmin.supuestos.obligatorio;
  if (!banco) errores.banco = textosAdmin.supuestos.obligatorio;
  if (!telefono) errores.telefono = textosAdmin.supuestos.obligatorio;
  if (!referencia) errores.referencia = textosAdmin.supuestos.obligatorio;
  if (Object.keys(errores).length > 0) return { ok: false, errores };

  const numeroCuenta = texto(formulario.numeroCuenta);
  const avisoEs = texto(formulario.avisoEs);
  const avisoEn = texto(formulario.avisoEn);
  return {
    ok: true,
    datos: {
      titular,
      banco,
      telefono,
      referencia,
      numeroCuenta: numeroCuenta || null,
      avisoEs: avisoEs || null,
      avisoEn: avisoEn || null,
    },
  };
}
