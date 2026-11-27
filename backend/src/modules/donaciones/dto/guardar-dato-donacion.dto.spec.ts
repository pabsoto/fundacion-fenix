import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GuardarDatoDonacionDto } from './guardar-dato-donacion.dto.js';

const entrada = {
  titular: 'Fundación FÉNIX',
  banco: 'Banco oficial',
  telefono: '70000000',
  referencia: 'Donación',
  numeroCuenta: '123-456',
  avisoEs: 'Aviso',
  avisoEn: 'Notice',
};

async function erroresDe(cambios: object): Promise<string[]> {
  const dto = plainToInstance(GuardarDatoDonacionDto, {
    ...entrada,
    ...cambios,
  });
  const errores = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errores.flatMap((error) => [
    error.property,
    ...Object.values(error.constraints ?? {}),
  ]);
}

describe('GuardarDatoDonacionDto', () => {
  it('acepta activo y una fecha real de vencimiento', async () => {
    await expect(
      erroresDe({ activo: true, qrVenceEl: '2026-12-01' }),
    ).resolves.toEqual([]);
  });

  it('acepta qrVenceEl null para quitar la fecha', async () => {
    await expect(erroresDe({ qrVenceEl: null })).resolves.toEqual([]);
  });

  it('rechaza una fecha inválida', async () => {
    const errores = await erroresDe({ qrVenceEl: '2026-02-31' });
    expect(errores).toContain('qrVenceEl');
  });

  it('rechaza un campo que no está en la lista', async () => {
    const errores = await erroresDe({ qrRuta: 'qr/no-autorizada.png' });
    expect(errores.join(' ')).toContain('qrRuta');
  });
});
