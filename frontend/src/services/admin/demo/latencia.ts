import { textosAdmin } from '@/content/textos-admin';

const MIN_MS = 300;
const MAX_MS = 600;

let simularError = false;

export class ErrorSimuladoAdmin extends Error {
  constructor() {
    super(textosAdmin.supuestos.error);
    this.name = 'ErrorSimuladoAdmin';
  }
}

export class NoEncontradoError extends Error {
  constructor() {
    super(textosAdmin.supuestos.noEncontrado);
    this.name = 'NoEncontradoError';
  }
}

/** Activa un fallo en la siguiente llamada mock. No afecta a Donaciones. */
export function configurarErrorSimulado(activo: boolean): void {
  simularError = activo;
}

export async function esperarMock(): Promise<void> {
  const espera = MIN_MS + Math.floor(Math.random() * (MAX_MS - MIN_MS + 1));
  await new Promise((resolver) => {
    setTimeout(resolver, espera);
  });
  if (simularError) throw new ErrorSimuladoAdmin();
}
