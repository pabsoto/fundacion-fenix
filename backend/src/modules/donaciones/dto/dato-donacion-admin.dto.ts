import { ApiProperty } from '@nestjs/swagger';

export class DatoDonacionAdminDto {
  @ApiProperty({ example: 'Fundación FÉNIX LPB' })
  readonly titular: string;

  @ApiProperty({ example: 'Banco Ejemplo' })
  readonly banco: string;

  @ApiProperty({ example: '+591 70000000' })
  readonly telefono: string;

  @ApiProperty({ example: 'Donación Fundación FÉNIX' })
  readonly referencia: string;

  @ApiProperty({ nullable: true, example: '123-456789-0' })
  readonly numeroCuenta: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Verifique los datos antes de donar.',
  })
  readonly avisoEs: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Verify the details before donating.',
  })
  readonly avisoEn: string | null;

  @ApiProperty({ example: true })
  readonly activo: boolean;
}

export class RespuestaDonacionAdminDto {
  @ApiProperty({ type: () => DatoDonacionAdminDto, nullable: true })
  readonly donacion: DatoDonacionAdminDto | null;
}

export class ResultadoGuardarDonacionDto {
  @ApiProperty({ enum: ['INSERT', 'UPDATE'], example: 'UPDATE' })
  readonly accion: 'INSERT' | 'UPDATE';

  @ApiProperty({ type: () => DatoDonacionAdminDto })
  readonly donacion: DatoDonacionAdminDto;
}
