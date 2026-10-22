import { Injectable } from '@nestjs/common';

/**
 * Transacción OAuth en curso. Se mantiene exclusivamente en memoria del
 * servidor: nunca se envía al navegador ni se persiste en la base de datos.
 *
 * - `state`: valor aleatorio que correlaciona la respuesta de Google con la
 *   solicitud iniciada (protección frente a CSRF).
 * - `nonce`: valor aleatorio que debe coincidir con el claim `nonce` del ID
 *   token (protección frente a reutilización de ID tokens).
 * - `codeVerifier`: secreto PKCE que se envía al *token endpoint*.
 * - `vinculacionNavegador`: valor aleatorio que además se entrega al navegador
 *   en una cookie firmada; permite comprobar que la respuesta corresponde al
 *   mismo navegador que inició el flujo.
 */
export interface TransaccionOAuth {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly vinculacionNavegador: string;
  readonly creadaEn: number;
  readonly expiraEn: number;
}

export type ResultadoConsumoTransaccion =
  | { readonly estado: 'encontrada'; readonly transaccion: TransaccionOAuth }
  | { readonly estado: 'expirada' }
  | { readonly estado: 'no_encontrada' };

/** Número máximo de transacciones pendientes simultáneas. */
export const MAX_TRANSACCIONES_PENDIENTES = 1_000;

/** Se lanza cuando se supera el máximo de transacciones pendientes. */
export class ErrorDemasiadasTransacciones extends Error {
  constructor() {
    super(
      'Se ha superado el máximo de transacciones de autenticación pendientes',
    );
    this.name = 'ErrorDemasiadasTransacciones';
  }
}

/**
 * Almacén en memoria de las transacciones OAuth pendientes.
 *
 * Cada transacción es de un solo uso: al consumirse se elimina, de modo que
 * una respuesta repetida de Google no puede canjearse dos veces.
 */
@Injectable()
export class AlmacenTransaccionesOAuth {
  private readonly transacciones = new Map<string, TransaccionOAuth>();

  registrar(transaccion: TransaccionOAuth): void {
    if (this.transacciones.size >= MAX_TRANSACCIONES_PENDIENTES) {
      this.purgarExpiradas();

      if (this.transacciones.size >= MAX_TRANSACCIONES_PENDIENTES) {
        throw new ErrorDemasiadasTransacciones();
      }
    }

    this.transacciones.set(transaccion.state, transaccion);
    this.purgarExpiradas();
  }

  /**
   * Consume la transacción asociada a `state`. La operación es irreversible:
   * aunque la transacción esté expirada se elimina del almacén.
   */
  consumir(state: string): ResultadoConsumoTransaccion {
    const transaccion = this.transacciones.get(state);
    if (!transaccion) {
      return { estado: 'no_encontrada' };
    }

    this.transacciones.delete(state);

    if (transaccion.expiraEn <= Date.now()) {
      return { estado: 'expirada' };
    }

    return { estado: 'encontrada', transaccion };
  }

  /**
   * Devuelve la transacción sin consumirla. Se utiliza para inspeccionar el
   * estado del proceso (por ejemplo, para preparar la respuesta al navegador)
   * sin invalidar la correlación con la solicitud iniciada.
   */
  obtener(state: string): TransaccionOAuth | undefined {
    return this.transacciones.get(state);
  }

  purgarExpiradas(): void {
    const ahora = Date.now();
    for (const [state, transaccion] of this.transacciones) {
      if (transaccion.expiraEn <= ahora) {
        this.transacciones.delete(state);
      }
    }
  }

  get total(): number {
    return this.transacciones.size;
  }
}
