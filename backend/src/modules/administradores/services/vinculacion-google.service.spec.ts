import { vi } from 'vitest';
import { IsNull, Repository } from 'typeorm';
import type { IdentidadGoogleVerificada } from '../dto/identidad-google-verificada.js';
import { Administrador } from '../entities/administrador.entity.js';
import {
  ErrorVinculacionGoogle,
  VinculacionGoogleService,
} from './vinculacion-google.service.js';

describe('VinculacionGoogleService', () => {
  let findOne: ReturnType<typeof vi.fn>;
  let update: ReturnType<typeof vi.fn>;
  let servicio: VinculacionGoogleService;

  const administradorSinVincular = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'administrador@fundacionfenix.org',
    nombre: 'Administración FÉNIX',
    googleSub: null,
    activo: true,
    ultimoAcceso: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
  } satisfies Administrador;

  const identidad: IdentidadGoogleVerificada = {
    sub: 'sub-google-1',
    email: 'administrador@fundacionfenix.org',
    emailVerified: true,
  };

  beforeEach(() => {
    findOne = vi.fn(async (opciones: { where: Record<string, unknown> }) => {
      const where = opciones.where;

      if ('googleSub' in where) {
        return null;
      }

      return { ...administradorSinVincular };
    });
    update = vi.fn().mockResolvedValue({ affected: 1 });
    const repositorio = {
      findOne,
      update,
    } as unknown as Repository<Administrador>;
    servicio = new VinculacionGoogleService(repositorio);
  });

  describe('preparación', () => {
    it('devuelve el candidato sin escribir en la base de datos', async () => {
      const preparacion = await servicio.preparar(
        'administrador@fundacionfenix.org',
        identidad,
      );

      expect(preparacion).toEqual({
        administradorId: '11111111-1111-1111-1111-111111111111',
        nombre: 'Administración FÉNIX',
        email: 'administrador@fundacionfenix.org',
        sub: 'sub-google-1',
      });
      expect(update).not.toHaveBeenCalled();
    });

    it('rechaza una cuenta inexistente', async () => {
      findOne.mockResolvedValueOnce(null);

      await expect(
        servicio.preparar('desconocido@fundacionfenix.org', identidad),
      ).rejects.toMatchObject({ motivo: 'inexistente' });
    });

    it('rechaza una cuenta inactiva', async () => {
      findOne.mockResolvedValueOnce({
        ...administradorSinVincular,
        activo: false,
      });

      await expect(
        servicio.preparar('administrador@fundacionfenix.org', identidad),
      ).rejects.toMatchObject({ motivo: 'inactivo' });
    });

    it('rechaza una cuenta que ya tiene una vinculación', async () => {
      findOne.mockResolvedValueOnce({
        ...administradorSinVincular,
        googleSub: 'sub-google-1',
      });

      await expect(
        servicio.preparar('administrador@fundacionfenix.org', identidad),
      ).rejects.toMatchObject({ motivo: 'ya_vinculado' });
    });

    it('rechaza una identidad de Google de otro correo', async () => {
      await expect(
        servicio.preparar('administrador@fundacionfenix.org', {
          ...identidad,
          email: 'otro@fundacionfenix.org',
        }),
      ).rejects.toMatchObject({ motivo: 'correo_no_coincide' });
    });
  });

  describe('confirmación', () => {
    it('vincula la identidad verificada a la cuenta aprobada', async () => {
      const resultado = await servicio.confirmar({
        administradorId: '11111111-1111-1111-1111-111111111111',
        sub: 'sub-google-1',
        identidad,
      });

      expect(resultado.googleSub).toBe('sub-google-1');
      expect(update).toHaveBeenCalledWith(
        {
          id: '11111111-1111-1111-1111-111111111111',
          googleSub: IsNull(),
        },
        expect.objectContaining({ googleSub: 'sub-google-1' }),
      );
    });

    it('no sobrescribe una vinculación existente', async () => {
      findOne.mockResolvedValueOnce({
        ...administradorSinVincular,
        googleSub: 'sub-google-otro',
      });

      await expect(
        servicio.confirmar({
          administradorId: '11111111-1111-1111-1111-111111111111',
          sub: 'sub-google-1',
          identidad,
        }),
      ).rejects.toMatchObject({ motivo: 'ya_vinculado' });
      expect(update).not.toHaveBeenCalled();
    });

    it('no vincula una identidad distinta a la verificada', async () => {
      await expect(
        servicio.confirmar({
          administradorId: '11111111-1111-1111-1111-111111111111',
          sub: 'sub-google-1',
          identidad: { ...identidad, sub: 'sub-google-otro' },
        }),
      ).rejects.toMatchObject({ motivo: 'identidad_no_coincide' });
      expect(update).not.toHaveBeenCalled();
    });

    it('no vincula un sub que ya pertenece a otra cuenta', async () => {
      findOne
        .mockResolvedValueOnce(administradorSinVincular)
        .mockResolvedValueOnce({
          ...administradorSinVincular,
          id: '22222222-2222-2222-2222-222222222222',
          googleSub: 'sub-google-1',
        });
      await expect(
        servicio.confirmar({
          administradorId: '11111111-1111-1111-1111-111111111111',
          sub: 'sub-google-1',
          identidad,
        }),
      ).rejects.toMatchObject({ motivo: 'sub_ya_asignado' });
      expect(update).not.toHaveBeenCalled();
    });

    it('informa el conflicto cuando la escritura condicional no se aplica', async () => {
      update.mockResolvedValue({ affected: 0 });

      await expect(
        servicio.confirmar({
          administradorId: '11111111-1111-1111-1111-111111111111',
          sub: 'sub-google-1',
          identidad,
        }),
      ).rejects.toBeInstanceOf(ErrorVinculacionGoogle);
      expect(update).toHaveBeenCalledOnce();
    });
  });
});
