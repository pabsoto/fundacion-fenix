export class TextoBilingueDto {
  readonly es: string | null;
  readonly en: string | null;
}

export class ContenidoInstitucionalPublicoDto {
  readonly clave: string;
  readonly titulo: TextoBilingueDto;
  readonly descripcion: TextoBilingueDto;
  readonly imagenUrl: string | null;
  readonly orden: number;
}
