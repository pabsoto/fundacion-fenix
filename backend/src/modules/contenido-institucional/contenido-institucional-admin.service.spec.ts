import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { vi } from 'vitest';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { ContenidoInstitucionalAdminService } from './contenido-institucional-admin.service.js';
import { ActualizarContenidoDto } from './dto/contenido-institucional-admin.dto.js';
import { ContenidoInstitucional } from './entities/contenido-institucional.entity.js';

const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const REGISTRO_ID = '22222222-2222-2222-2222-222222222222';

const entrada: ActualizarContenidoDto = {
  tituloEs: 'Nuevo título',
  tituloEn: 'New title',
  textoEs: 'Nuevo texto',
  textoEn: 'New text',
  visible: false,
};

function crearContenido(
  cambios: Partial<ContenidoInstitucional> = {},
): ContenidoInstitucional {
  return {
    id: REGISTRO_ID,
    clave: 'hero_principal',
    tituloEs: 'Título anterior',
    tituloEn: 'Previous title',
    textoEs: 'Texto anterior',
    textoEn: 'Previous text',
    imagenRuta: 'contenido/hero.png',
    orden: 1,
    visible: true,
    actualizadoPorId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actualizadoPor: null,
    creadoEn: new Date('2026-01-01T00:00:00.000Z'),
    actualizadoEn: new Date('2026-01-01T00:00:00.000Z'),
    ...cambios,
  };
}

describe('ContenidoInstitucionalAdminService', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const guardar = vi.fn(async (fila: ContenidoInstitucional) => fila);
  const crearAuditoria = vi.fn((datos: Partial<Auditoria>) => datos);
  const guardarAuditoria = vi.fn(async (dato: Partial<Auditoria>) => dato);

  const manager = {
    getRepository: vi.fn((entidad: unknown) =>
      entidad === ContenidoInstitucional
        ? { findOne, save: guardar }
        : { create: crearAuditoria, save: guardarAuditoria },
    ),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (operacion: (entityManager: EntityManager) => Promise<unknown>) =>
      operacion(manager),
  );
  const servicio = new ContenidoInstitucionalAdminService(
    { find } as unknown as Repository<ContenidoInstitucional>,
    { transaction } as unknown as DataSource,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(crearContenido());
    guardar.mockImplementation(async (fila: ContenidoInstitucional) => fila);
    guardarAuditoria.mockImplementation(
      async (dato: Partial<Auditoria>) => dato,
    );
  });

  it('lista las secciones sin datos de administradores', async () => {
    find.mockResolvedValue([crearContenido()]);

    const secciones = await servicio.listar();

    expect(find).toHaveBeenCalledWith({
      order: { orden: 'ASC', clave: 'ASC' },
    });
    expect(secciones).toHaveLength(1);
    expect(secciones[0]).toMatchObject({ clave: 'hero_principal' });
    expect(secciones[0]).not.toHaveProperty('actualizadoPorId');
    expect(secciones[0]).not.toHaveProperty('id');
  });

  it('oculta el error de PostgreSQL al listar', async () => {
    find.mockRejectedValue(new Error('detalle secreto'));

    await expect(servicio.listar()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('actualiza la sección y registra la auditoría con los campos cambiados', async () => {
    const resultado = await servicio.actualizar(
      'hero_principal',
      entrada,
      ADMIN_ID,
    );

    expect(findOne).toHaveBeenCalledWith({
      where: { clave: 'hero_principal' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(resultado).toMatchObject({
      clave: 'hero_principal',
      tituloEs: 'Nuevo título',
      textoEs: 'Nuevo texto',
      visible: false,
      imagenRuta: 'contenido/hero.png',
    });
    expect(guardar.mock.calls[0][0]).toMatchObject({
      actualizadoPorId: ADMIN_ID,
    });

    const auditoria = crearAuditoria.mock.calls[0][0];
    expect(auditoria).toMatchObject({
      administradorId: ADMIN_ID,
      tabla: 'contenido_institucional',
      registroId: REGISTRO_ID,
      accion: 'UPDATE',
    });
    expect(auditoria.camposModificados).toEqual(
      expect.arrayContaining([
        'titulo_es',
        'titulo_en',
        'texto_es',
        'texto_en',
        'visible',
        'actualizado_por',
        'actualizado_en',
      ]),
    );
    expect(auditoria.camposModificados).not.toContain('orden');
    expect(auditoria.camposModificados).not.toContain('imagen_ruta');
    expect(auditoria.datosAntes).toMatchObject({ texto_es: 'Texto anterior' });
    expect(auditoria.datosDespues).toMatchObject({ texto_es: 'Nuevo texto' });
    expect(guardarAuditoria).toHaveBeenCalledTimes(1);
  });

  it('guarda null en los campos opcionales omitidos', async () => {
    await servicio.actualizar(
      'hero_principal',
      { textoEs: 'Solo español', visible: true },
      ADMIN_ID,
    );

    expect(guardar.mock.calls[0][0]).toMatchObject({
      textoEs: 'Solo español',
      textoEn: null,
      tituloEs: null,
      tituloEn: null,
    });
  });

  it('responde 404 sin guardar ni auditar si la sección no existe', async () => {
    findOne.mockResolvedValue(null);

    await expect(
      servicio.actualizar('no_existe', entrada, ADMIN_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(guardar).not.toHaveBeenCalled();
    expect(guardarAuditoria).not.toHaveBeenCalled();
  });

  it('oculta el detalle si falla la auditoría', async () => {
    guardarAuditoria.mockRejectedValue(new Error('detalle secreto'));

    const error = await servicio
      .actualizar('hero_principal', entrada, ADMIN_ID)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toContain('secreto');
  });
});
