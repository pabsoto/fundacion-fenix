import { DataSource } from 'typeorm';
import { createDatabaseOptions } from '../src/database/database-options.js';
import { Auditoria } from '../src/modules/auditoria/entities/auditoria.entity.js';
import { DonacionesAdminService } from '../src/modules/donaciones/donaciones-admin.service.js';
import { DonacionesQrService } from '../src/modules/donaciones/donaciones-qr.service.js';
import { DonacionesPublicasService } from '../src/modules/donaciones/donaciones-publicas.service.js';
import { DatoDonacion } from '../src/modules/donaciones/entities/dato-donacion.entity.js';
import { StorageService } from '../src/modules/storage/storage.service.js';

const URL_PRUEBAS = process.env.TEST_DATABASE_URL;
const CA_PRUEBAS = process.env.TEST_DATABASE_CA_CERT_PATH;
const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from([
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]),
]);

const entrada = {
  titular: 'Fundación FÉNIX LPB',
  banco: 'Banco oficial',
  telefono: '+591 70000000',
  referencia: 'Donación institucional',
  numeroCuenta: '123-456',
  avisoEs: 'Verifique el titular',
  avisoEn: 'Verify the account holder',
};

describe.skipIf(!URL_PRUEBAS)(
  'administración de donaciones en PostgreSQL aislado (integración)',
  () => {
    let dataSource: DataSource;
    let servicio: DonacionesAdminService;
    let servicioPublico: DonacionesPublicasService;
    let servicioQr: DonacionesQrService;
    const subir = vi.fn().mockResolvedValue(undefined);
    const eliminar = vi.fn().mockResolvedValue(undefined);

    beforeAll(async () => {
      const opciones = createDatabaseOptions({
        DATABASE_URL: URL_PRUEBAS,
        ...(CA_PRUEBAS ? { DATABASE_CA_CERT_PATH: CA_PRUEBAS } : {}),
      } as NodeJS.ProcessEnv);

      dataSource = new DataSource({
        ...opciones,
        // La instancia efímera local no configura TLS. Esta excepción existe
        // sólo en la suite aislada; la configuración del backend sigue
        // exigiendo TLS verificado para Supabase.
        ssl: CA_PRUEBAS ? opciones.ssl : false,
      });
      await dataSource.initialize();

      const repositorio = dataSource.getRepository(DatoDonacion);
      servicio = new DonacionesAdminService(repositorio, dataSource);
      servicioPublico = new DonacionesPublicasService(repositorio, {
        obtenerUrlPublica: (ruta: string) => `https://storage.example/${ruta}`,
      } as StorageService);
      servicioQr = new DonacionesQrService(dataSource, {
        subir,
        eliminar,
      } as unknown as StorageService);
    });

    afterEach(async () => {
      await dataSource.getRepository(Auditoria).clear();
      await dataSource.getRepository(DatoDonacion).clear();
      await dataSource.query(
        'ALTER TABLE public.auditoria DROP CONSTRAINT IF EXISTS ck_auditoria_fallo_prueba',
      );
      vi.clearAllMocks();
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
    });

    it('crea la configuración y la auditoría y la publica inmediatamente', async () => {
      const resultado = await servicio.guardar(entrada, ADMIN_ID);

      expect(resultado.accion).toBe('INSERT');
      expect(await dataSource.getRepository(DatoDonacion).count()).toBe(1);

      const auditoria = await dataSource.getRepository(Auditoria).findOneBy({
        tabla: 'datos_donacion',
      });
      expect(auditoria).toMatchObject({
        administradorId: ADMIN_ID,
        accion: 'INSERT',
        datosAntes: null,
      });
      await expect(servicioPublico.obtenerActiva()).resolves.toMatchObject({
        titular: entrada.titular,
        banco: entrada.banco,
      });
    });

    it('actualiza sin modificar QR y registra valores anteriores y posteriores', async () => {
      const repositorio = dataSource.getRepository(DatoDonacion);
      const existente = await repositorio.save(
        repositorio.create({
          ...entrada,
          banco: 'Banco anterior',
          avisoEs: 'Aviso anterior',
          qrRuta: 'donaciones/qr-preservado.png',
          qrVenceEl: '2027-06-30',
          activo: true,
          creadoPorId: ADMIN_ID,
          actualizadoPorId: ADMIN_ID,
        }),
      );

      const resultado = await servicio.guardar(entrada, ADMIN_ID);
      const actualizada = await repositorio.findOneByOrFail({
        id: existente.id,
      });
      const auditoria = await dataSource
        .getRepository(Auditoria)
        .findOneByOrFail({
          registroId: existente.id,
        });

      expect(resultado.accion).toBe('UPDATE');
      expect(actualizada.qrRuta).toBe('donaciones/qr-preservado.png');
      expect(actualizada.qrVenceEl).toBe('2027-06-30');
      expect(auditoria.datosAntes).toMatchObject({ banco: 'Banco anterior' });
      expect(auditoria.datosDespues).toMatchObject({ banco: 'Banco oficial' });
    });

    it('revierte la donación cuando PostgreSQL rechaza la auditoría', async () => {
      await dataSource.query(
        `ALTER TABLE public.auditoria
         ADD CONSTRAINT ck_auditoria_fallo_prueba
         CHECK (tabla <> 'datos_donacion')`,
      );

      await expect(servicio.guardar(entrada, ADMIN_ID)).rejects.toThrow(
        'No fue posible guardar los datos de donación',
      );
      expect(await dataSource.getRepository(DatoDonacion).count()).toBe(0);
      expect(await dataSource.getRepository(Auditoria).count()).toBe(0);
    });

    it('el índice real impide dos configuraciones activas', async () => {
      const repositorio = dataSource.getRepository(DatoDonacion);
      await repositorio.save(
        repositorio.create({
          ...entrada,
          activo: true,
          creadoPorId: ADMIN_ID,
          actualizadoPorId: ADMIN_ID,
        }),
      );

      await expect(
        repositorio.save(
          repositorio.create({
            ...entrada,
            referencia: 'Segunda configuración',
            activo: true,
            creadoPorId: ADMIN_ID,
            actualizadoPorId: ADMIN_ID,
          }),
        ),
      ).rejects.toMatchObject({ driverError: { code: '23505' } });
      expect(await repositorio.countBy({ activo: true })).toBe(1);
    });

    it('confirma el QR y su auditoría en una transacción PostgreSQL real', async () => {
      await servicio.guardar(entrada, ADMIN_ID);
      await dataSource.getRepository(Auditoria).clear();

      await servicioQr.reemplazar(
        {
          originalname: 'qr.png',
          mimetype: 'image/png',
          size: PNG.length,
          buffer: PNG,
        },
        '2099-12-31',
        ADMIN_ID,
      );

      const guardada = await dataSource
        .getRepository(DatoDonacion)
        .findOneByOrFail({ activo: true });
      const auditoria = await dataSource
        .getRepository(Auditoria)
        .findOneByOrFail({ registroId: guardada.id });
      expect(guardada).toMatchObject({
        banco: entrada.banco,
        qrVenceEl: '2099-12-31',
        actualizadoPorId: ADMIN_ID,
      });
      expect(guardada.qrRuta).toMatch(/^qr\/.+\/.+\.png$/);
      expect(auditoria).toMatchObject({
        accion: 'UPDATE',
        datosAntes: expect.objectContaining({ qr_ruta: null }),
        datosDespues: expect.objectContaining({ qr_ruta: guardada.qrRuta }),
      });
    });

    it('revierte el QR y compensa Storage cuando falla la auditoría real', async () => {
      await servicio.guardar(entrada, ADMIN_ID);
      await dataSource.getRepository(Auditoria).clear();
      await dataSource.query(
        `ALTER TABLE public.auditoria
         ADD CONSTRAINT ck_auditoria_fallo_prueba
         CHECK (tabla <> 'datos_donacion')`,
      );

      await expect(
        servicioQr.reemplazar(
          {
            originalname: 'qr.png',
            mimetype: 'image/png',
            size: PNG.length,
            buffer: PNG,
          },
          undefined,
          ADMIN_ID,
        ),
      ).rejects.toThrow('No fue posible guardar el QR');

      const guardada = await dataSource
        .getRepository(DatoDonacion)
        .findOneByOrFail({ activo: true });
      expect(guardada.qrRuta).toBeNull();
      expect(await dataSource.getRepository(Auditoria).count()).toBe(0);
      expect(eliminar).toHaveBeenCalledWith(
        expect.stringMatching(/^qr\/.+\/.+\.png$/),
      );
    });
  },
);
