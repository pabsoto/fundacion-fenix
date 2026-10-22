import { TipoCanalContacto } from '../entities/canal-contacto.entity.js';

export class CanalContactoPublicoDto {
  readonly tipo: TipoCanalContacto;
  readonly url: string;
  readonly texto: {
    readonly es: string | null;
    readonly en: string | null;
  };
  readonly orden: number;
}
