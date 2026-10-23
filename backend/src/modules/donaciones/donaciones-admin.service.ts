import {
  ConflictException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import {
  DatoDonacionAdminDto,
  RespuestaDonacionAdminDto,
  ResultadoDesactivarDonacionDto,
  ResultadoGuardarDonacionDto,
} from './dto/dato-donacion-admin.dto.js';
import { GuardarDatoDonacionDto } from './dto/guardar-dato-donacion.dto.js';
import { DatoDonacion } from './entities/dato-donacion.entity.js';

const CAMPOS_EDITABLES = [
  'titular',
  'banco',
  'telefono',
  'referencia',
  'numero_cuenta',
  'aviso_es',
  'aviso_en',
] as const;

@Injectable()
export class DonacionesAdminService {
  constructor(
    @InjectRepository(DatoDonacion)
    private readonly repositorio: Repository<DatoDonacion>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async obtenerActiva(): Promise<RespuestaDonacionAdminDto> {
    try {
      const configuraciones = await this.repositorio.find({
        select: {
          titular: true,
          banco: true,
          telefono: true,
          referencia: true,
          numeroCuenta: true,
          avisoEs: true,
          avisoEn: true,
          activo: true,
          qrRuta: true,
          qrVenceEl: true,
        },
        where: { activo: true },
        take: 2,
      });

      if (configuraciones.length > 1) {
        throw new ServiceUnavailableException(
          'La configuración de donaciones activas es inconsistente',
        );
      }

      return {
        donacion: configuraciones[0] ? this.aDto(configuraciones[0]) : null,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'Los datos administrativos de donación no están disponibles temporalmente',
      );
    }
  }

  async guardar(
    entrada: GuardarDatoDonacionDto,
    administradorId: string,
  ): Promise<ResultadoGuardarDonacionDto> {
    try {
      return await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager) =>
          this.guardarEnTransaccion(manager, entrada, administradorId),
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      if (this.esConflictoUnicidad(error)) {
        throw new ConflictException(
          'Ya existe otra configuración activa de donaciones',
        );
      }
      throw new ServiceUnavailableException(
        'No fue posible guardar los datos de donación',
      );
    }
  }

  async desactivar(
    administradorId: string,
  ): Promise<ResultadoDesactivarDonacionDto> {
    try {
      return await this.dataSource.transaction(
        'SERIALIZABLE',
        async (manager) => {
          const donaciones = manager.getRepository(DatoDonacion);
          const auditorias = manager.getRepository(Auditoria);
          const activas = await donaciones.find({
            where: { activo: true },
            take: 2,
            lock: { mode: 'pessimistic_write' },
          });

          if (activas.length > 1) {
            throw new ConflictException(
              'Existe mÃ¡s de una configuraciÃ³n activa de donaciones',
            );
          }
          if (activas.length === 0) return { desactivada: false };

          const donacion = activas[0];
          const datosAntes = this.aSnapshot(donacion);
          donacion.activo = false;
          donacion.actualizadoPorId = administradorId;
          donacion.actualizadoEn = new Date();
          const guardada = await donaciones.save(donacion);

          await auditorias.save(
            auditorias.create({
              administradorId,
              tabla: 'datos_donacion',
              registroId: guardada.id,
              accion: 'UPDATE',
              camposModificados: ['activo', 'actualizado_por', 'actualizado_en'],
              datosAntes,
              datosDespues: this.aSnapshot(guardada),
            }),
          );
          return { desactivada: true };
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible desactivar los datos de donaciÃ³n',
      );
    }
  }

  private async guardarEnTransaccion(
    manager: EntityManager,
    entrada: GuardarDatoDonacionDto,
    administradorId: string,
  ): Promise<ResultadoGuardarDonacionDto> {
    const donaciones = manager.getRepository(DatoDonacion);
    const auditorias = manager.getRepository(Auditoria);
    const activas = await donaciones.find({
      where: { activo: true },
      take: 2,
      lock: { mode: 'pessimistic_write' },
    });

    if (activas.length > 1) {
      throw new ConflictException(
        'Existe más de una configuración activa de donaciones',
      );
    }

    const existente = activas[0];
    const accion = existente ? 'UPDATE' : 'INSERT';
    const datosAntes = existente ? this.aSnapshot(existente) : null;
    const ahora = new Date();

    const donacion = existente
      ? Object.assign(existente, {
          titular: entrada.titular,
          banco: entrada.banco,
          telefono: entrada.telefono,
          referencia: entrada.referencia,
          numeroCuenta: entrada.numeroCuenta ?? null,
          avisoEs: entrada.avisoEs ?? null,
          avisoEn: entrada.avisoEn ?? null,
          activo: true,
          actualizadoPorId: administradorId,
          actualizadoEn: ahora,
        })
      : donaciones.create({
          titular: entrada.titular,
          banco: entrada.banco,
          telefono: entrada.telefono,
          referencia: entrada.referencia,
          numeroCuenta: entrada.numeroCuenta ?? null,
          avisoEs: entrada.avisoEs ?? null,
          avisoEn: entrada.avisoEn ?? null,
          activo: true,
          creadoPorId: administradorId,
          actualizadoPorId: administradorId,
          creadoEn: ahora,
          actualizadoEn: ahora,
        });

    const guardada = await donaciones.save(donacion);
    const datosDespues = this.aSnapshot(guardada);
    const camposModificados = this.camposModificados(
      datosAntes,
      datosDespues,
      accion,
    );

    const auditoria = auditorias.create({
      administradorId,
      tabla: 'datos_donacion',
      registroId: guardada.id,
      accion,
      camposModificados,
      datosAntes,
      datosDespues,
    });
    await auditorias.save(auditoria);

    return { accion, donacion: this.aDto(guardada) };
  }

  private aDto(donacion: DatoDonacion): DatoDonacionAdminDto {
    return {
      titular: donacion.titular,
      banco: donacion.banco,
      telefono: donacion.telefono,
      referencia: donacion.referencia,
      numeroCuenta: donacion.numeroCuenta,
      avisoEs: donacion.avisoEs,
      avisoEn: donacion.avisoEn,
      activo: donacion.activo,
      qr: {
        disponible: donacion.qrRuta !== null,
        venceEl: donacion.qrVenceEl,
      },
    };
  }

  private aSnapshot(donacion: DatoDonacion): Record<string, unknown> {
    return {
      id: donacion.id,
      titular: donacion.titular,
      banco: donacion.banco,
      telefono: donacion.telefono,
      referencia: donacion.referencia,
      numero_cuenta: donacion.numeroCuenta,
      qr_ruta: donacion.qrRuta,
      qr_vence_el: donacion.qrVenceEl,
      aviso_es: donacion.avisoEs,
      aviso_en: donacion.avisoEn,
      activo: donacion.activo,
      creado_por: donacion.creadoPorId,
      actualizado_por: donacion.actualizadoPorId,
      creado_en: donacion.creadoEn,
      actualizado_en: donacion.actualizadoEn,
    };
  }

  private camposModificados(
    antes: Record<string, unknown> | null,
    despues: Record<string, unknown>,
    accion: 'INSERT' | 'UPDATE',
  ): string[] {
    if (accion === 'INSERT') {
      return [...CAMPOS_EDITABLES, 'activo', 'creado_por', 'actualizado_por'];
    }

    return Object.keys(despues).filter(
      (campo) => campo !== 'id' && antes?.[campo] !== despues[campo],
    );
  }

  private esConflictoUnicidad(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === '23505'
    );
  }
}
