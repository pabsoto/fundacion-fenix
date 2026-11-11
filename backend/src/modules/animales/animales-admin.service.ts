import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { StorageService } from '../storage/storage.service.js';
import {
  datosDePagina,
  resolverPagina,
} from '../../common/dto/pagina.dto.js';
import { AnimalDto } from './dto/animal.dto.js';
import {
  ConsultaAnimalesDto,
  PaginaAnimalesDto,
} from './dto/consulta-animales.dto.js';
import { RegistrarAnimalDto } from './dto/registrar-animal.dto.js';
import { Animal } from './entities/animal.entity.js';

@Injectable()
export class AnimalesAdminService {
  private readonly logger = new Logger(AnimalesAdminService.name);

  constructor(
    @InjectRepository(Animal)
    private readonly repositorio: Repository<Animal>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async listar(
    consulta: ConsultaAnimalesDto = {},
  ): Promise<PaginaAnimalesDto> {
    const { pagina, limite, desde } = resolverPagina(consulta);
    try {
      const [animales, total] = await this.repositorio.findAndCount({
        where: {
          eliminadoEn: IsNull(),
          ...(consulta.adoptado !== undefined && {
            adoptado: consulta.adoptado,
          }),
        },
        order: { creadoEn: 'DESC', id: 'ASC' },
        skip: desde,
        take: limite,
      });
      return {
        items: animales.map((animal) => this.aDto(animal)),
        ...datosDePagina(total, pagina, limite),
      };
    } catch {
      throw new ServiceUnavailableException(
        'Los animales no están disponibles temporalmente',
      );
    }
  }

  async obtener(id: string): Promise<AnimalDto> {
    let animal: Animal | null;
    try {
      animal = await this.repositorio.findOne({
        where: { id, eliminadoEn: IsNull() },
      });
    } catch {
      throw new ServiceUnavailableException(
        'Los animales no están disponibles temporalmente',
      );
    }
    if (!animal) throw new NotFoundException('El animal no existe');
    return this.aDto(animal);
  }

  async registrar(
    entrada: RegistrarAnimalDto,
    administradorId: string,
  ): Promise<AnimalDto> {
    this.validarAdopcion(entrada);
    try {
      return await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const animales = manager.getRepository(Animal);
          const ahora = new Date();
          const guardado = await animales.save(
            animales.create({
              nombre: entrada.nombre,
              especie: entrada.especie,
              sexo: entrada.sexo ?? null,
              edad: entrada.edad ?? null,
              edadUnidad: entrada.edad == null ? null : entrada.edadUnidad,
              fechaIngreso: entrada.fechaIngreso ?? null,
              adoptado: entrada.adoptado,
              nombreAdoptante: entrada.nombreAdoptante ?? null,
              direccionAdoptante: entrada.direccionAdoptante ?? null,
              fechaAdopcion: entrada.fechaAdopcion ?? null,
              creadoPorId: administradorId,
              actualizadoPorId: administradorId,
              creadoEn: ahora,
              actualizadoEn: ahora,
            }),
          );
          const datosDespues = this.datosAuditables(guardado);
          const auditorias = manager.getRepository(Auditoria);
          await auditorias.save(
            auditorias.create({
              tabla: 'animales',
              administradorId,
              registroId: guardado.id,
              accion: 'INSERT',
              camposModificados: Object.keys(datosDespues).filter(
                (campo) => campo !== 'id' && datosDespues[campo] !== null,
              ),
              datosAntes: null,
              datosDespues,
            }),
          );
          return this.aDto(guardado);
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible registrar el animal',
      );
    }
  }

  /**
   * Reemplaza los datos del animal. Conserva sus fotos, salvo la de la entrega
   * cuando el animal deja de estar adoptado: la base no admite esa combinación.
   */
  async actualizar(
    id: string,
    entrada: RegistrarAnimalDto,
    administradorId: string,
  ): Promise<AnimalDto> {
    this.validarAdopcion(entrada);
    let rutaEntregaRetirada: string | null = null;

    let actualizado: Animal;
    try {
      actualizado = await this.dataSource.transaction(
        'READ COMMITTED',
        async (manager) => {
          const animales = manager.getRepository(Animal);
          const existente = await animales.findOne({
            where: { id, eliminadoEn: IsNull() },
            lock: { mode: 'pessimistic_write' },
          });
          if (!existente) throw new NotFoundException('El animal no existe');

          const datosAntes = this.datosAuditables(existente);
          if (!entrada.adoptado && existente.fotoEntregaRuta) {
            rutaEntregaRetirada = existente.fotoEntregaRuta;
          }

          Object.assign(existente, {
            nombre: entrada.nombre,
            especie: entrada.especie,
            sexo: entrada.sexo ?? null,
            edad: entrada.edad ?? null,
            edadUnidad: entrada.edad == null ? null : entrada.edadUnidad,
            fechaIngreso: entrada.fechaIngreso ?? null,
            adoptado: entrada.adoptado,
            nombreAdoptante: entrada.adoptado ? entrada.nombreAdoptante : null,
            direccionAdoptante: entrada.adoptado
              ? entrada.direccionAdoptante
              : null,
            fechaAdopcion: entrada.adoptado ? entrada.fechaAdopcion : null,
            ...(entrada.adoptado
              ? {}
              : {
                  fotoEntregaRuta: null,
                  fotoEntregaContentType: null,
                  fotoEntregaTamano: null,
                }),
            actualizadoPorId: administradorId,
            actualizadoEn: new Date(),
          });
          const guardado = await animales.save(existente);
          const datosDespues = this.datosAuditables(guardado);

          await this.auditar(manager.getRepository(Auditoria), {
            administradorId,
            registroId: guardado.id,
            accion: 'UPDATE',
            camposModificados: Object.keys(datosDespues).filter(
              (campo) =>
                campo !== 'id' &&
                campo !== 'actualizadoEn' &&
                datosAntes[campo] !== datosDespues[campo],
            ),
            datosAntes,
            datosDespues,
          });
          return guardado;
        },
      );
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible actualizar el animal',
      );
    }

    if (rutaEntregaRetirada) await this.limpiar(rutaEntregaRetirada);
    return this.aDto(actualizado);
  }

  /**
   * Borrado lógico: el animal deja de aparecer y de contar y el registro se
   * conserva para auditarlo, pero sus fotos se borran de Storage porque son
   * datos privados (adopciones).
   */
  async eliminar(id: string, administradorId: string): Promise<void> {
    const rutas: string[] = [];
    try {
      await this.dataSource.transaction('READ COMMITTED', async (manager) => {
        const animales = manager.getRepository(Animal);
        const existente = await animales.findOne({
          where: { id, eliminadoEn: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });
        if (!existente) throw new NotFoundException('El animal no existe');

        const datosAntes = this.datosAuditables(existente);
        for (const ruta of [existente.fotoAnimalRuta, existente.fotoEntregaRuta]) {
          if (ruta) rutas.push(ruta);
        }
        const ahora = new Date();
        Object.assign(existente, {
          fotoAnimalRuta: null,
          fotoAnimalContentType: null,
          fotoAnimalTamano: null,
          fotoEntregaRuta: null,
          fotoEntregaContentType: null,
          fotoEntregaTamano: null,
          eliminadoEn: ahora,
          eliminadoPorId: administradorId,
          actualizadoPorId: administradorId,
          actualizadoEn: ahora,
        });
        await animales.save(existente);

        await this.auditar(manager.getRepository(Auditoria), {
          administradorId,
          registroId: id,
          accion: 'DELETE',
          camposModificados: Object.keys(datosAntes).filter(
            (campo) => campo !== 'id',
          ),
          datosAntes,
          datosDespues: null,
        });
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException(
        'No fue posible eliminar el animal',
      );
    }

    // Después de confirmar el borrado: si Storage falla, queda registrado.
    for (const ruta of rutas) await this.limpiar(ruta);
  }

  private async auditar(
    auditorias: Repository<Auditoria>,
    datos: Pick<
      Auditoria,
      | 'administradorId'
      | 'registroId'
      | 'accion'
      | 'camposModificados'
      | 'datosAntes'
      | 'datosDespues'
    >,
  ): Promise<void> {
    await auditorias.save(auditorias.create({ tabla: 'animales', ...datos }));
  }

  /** Los indicadores de foto son de solo lectura: no son datos guardados. */
  private datosAuditables(animal: Animal): Record<string, unknown> {
    const datos: Record<string, unknown> = { ...this.aDto(animal) };
    delete datos.tieneFotoAnimal;
    delete datos.tieneFotoEntrega;
    return datos;
  }

  private async limpiar(ruta: string): Promise<void> {
    await this.storage.eliminar(ruta, true).catch((error: unknown) => {
      this.logger.error(
        `Limpieza pendiente de Supabase Storage para ${ruta}`,
        error instanceof Error ? error.message : 'Error de Storage',
      );
    });
  }

  private validarAdopcion(entrada: RegistrarAnimalDto): void {
    if (!entrada.adoptado) {
      if (
        entrada.nombreAdoptante ||
        entrada.direccionAdoptante ||
        entrada.fechaAdopcion
      ) {
        throw new BadRequestException(
          'Un animal no adoptado no puede tener datos de adopción',
        );
      }
      return;
    }
    const hoy = new Date().toISOString().slice(0, 10);
    if (entrada.fechaAdopcion && entrada.fechaAdopcion > hoy) {
      throw new BadRequestException('La fecha de adopción no puede ser futura');
    }
    if (
      entrada.fechaIngreso &&
      entrada.fechaAdopcion &&
      entrada.fechaAdopcion < entrada.fechaIngreso
    ) {
      throw new BadRequestException(
        'La fecha de adopción no puede ser anterior al ingreso',
      );
    }
  }

  private aDto(animal: Animal): AnimalDto {
    return {
      id: animal.id,
      nombre: animal.nombre,
      especie: animal.especie,
      sexo: animal.sexo,
      edad: animal.edad,
      edadUnidad: animal.edadUnidad,
      fechaIngreso: animal.fechaIngreso,
      adoptado: animal.adoptado,
      nombreAdoptante: animal.nombreAdoptante,
      direccionAdoptante: animal.direccionAdoptante,
      fechaAdopcion: animal.fechaAdopcion,
      tieneFotoAnimal: animal.fotoAnimalRuta !== null,
      tieneFotoEntrega: animal.fotoEntregaRuta !== null,
      creadoEn: new Date(animal.creadoEn).toISOString(),
      actualizadoEn: new Date(animal.actualizadoEn).toISOString(),
    };
  }
}
