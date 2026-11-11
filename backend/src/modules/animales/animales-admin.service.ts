import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Auditoria } from '../auditoria/entities/auditoria.entity.js';
import { AnimalDto } from './dto/animal.dto.js';
import { RegistrarAnimalDto } from './dto/registrar-animal.dto.js';
import { Animal } from './entities/animal.entity.js';

@Injectable()
export class AnimalesAdminService {
  constructor(
    @InjectRepository(Animal)
    private readonly repositorio: Repository<Animal>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async listar(adoptado?: boolean): Promise<AnimalDto[]> {
    try {
      const animales = await this.repositorio.find({
        where: {
          eliminadoEn: IsNull(),
          ...(adoptado !== undefined && { adoptado }),
        },
        order: { creadoEn: 'DESC' },
      });
      return animales.map((animal) => this.aDto(animal));
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
          const datosDespues: Record<string, unknown> = {
            ...this.aDto(guardado),
          };
          // Indicadores de solo lectura: no son datos guardados del animal.
          delete datosDespues.tieneFotoAnimal;
          delete datosDespues.tieneFotoEntrega;
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
