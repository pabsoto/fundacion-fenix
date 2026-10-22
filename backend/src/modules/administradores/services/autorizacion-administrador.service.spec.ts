import { vi } from 'vitest';
import { Repository } from 'typeorm';
import type { IdentidadGoogleVerificada } from '../dto/identidad-google-verificada.js';
import { Administrador } from '../entities/administrador.entity.js';
import { AutorizacionAdministradorService } from './autorizacion-administrador.service.js';

describe('AutorizacionAdministradorService', () => {
  let findOne: ReturnType<typeof vi.fn>;
  let servicio: AutorizacionAdministradorService;

  const administradorActivo = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'administrador@fundacionfenix.org',
    nombre: 'Administración FÉNIX',
    googleSub: 'sub-google-1',
    activo: true,
    ultimoAcceso: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
  } satisfies Administrador;

  function identidad(
    extra: Partial<IdentidadGoogleVerificada> = {},
  ): IdentidadGoogleVerificada {
    return {
      sub: 'sub-google-1',
      email: 'administrador@fundacionfenix.org',
      emailVerified: true,
      ...extra,
    };
  }

  beforeEach(() => {
    findOne = vi.fn().mockResolvedValue(administradorActivo);
    const repositorio = { findOne } as unknown as Repository<Administrador>;
    servicio = new AutorizacionAdministradorService(repositorio);
  });

  it('autoriza a la cuenta existente, activa y ya vinculada', async () => {
    const resultado = await servicio.autorizar(identidad());

    expect(resultado).toEqual({
      estado: 'autorizado',
      administrador: {
        id: '11111111-1111-1111-1111-111111111111',
        nombre: 'Administración FÉNIX',
        email: 'administrador@fundacionfenix.org',
        googleSub: 'sub-google-1',
        vinculado: true,
      },
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { email: 'administrador@fundacionfenix.org' },
    });
  });

  it('rechaza una cuenta que no está registrada', async () => {
    findOne.mockResolvedValue(null);

    await expect(servicio.autorizar(identidad())).resolves.toEqual({
      estado: 'no_autorizado',
      motivo: 'inexistente',
    });
  });

  it('rechaza una cuenta desactivada', async () => {
    findOne.mockResolvedValue({ ...administradorActivo, activo: false });

    await expect(servicio.autorizar(identidad())).resolves.toEqual({
      estado: 'no_autorizado',
      motivo: 'inactivo',
    });
  });

  it('rechaza un correo no verificado por Google', async () => {
    await expect(
      servicio.autorizar(identidad({ emailVerified: false })),
    ).resolves.toEqual({
      estado: 'no_autorizado',
      motivo: 'correo_no_verificado',
    });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('rechaza una identidad de Google distinta a la vinculada', async () => {
    await expect(
      servicio.autorizar(identidad({ sub: 'sub-google-otro' })),
    ).resolves.toEqual({
      estado: 'no_autorizado',
      motivo: 'vinculacion_otro_sub',
    });
  });

  it('informa la vinculación pendiente cuando google_sub está vacío', async () => {
    findOne.mockResolvedValue({ ...administradorActivo, googleSub: null });

    const resultado = await servicio.autorizar(identidad());

    expect(resultado).toMatchObject({
      estado: 'vinculacion_pendiente',
      administrador: { vinculado: false, googleSub: null },
    });
  });

  it('normaliza el correo a minúsculas al buscar la cuenta', async () => {
    await servicio.autorizar(
      identidad({ email: 'Administrador@FundacionFenix.org' }),
    );

    expect(findOne).toHaveBeenCalledWith({
      where: { email: 'administrador@fundacionfenix.org' },
    });
  });
});
