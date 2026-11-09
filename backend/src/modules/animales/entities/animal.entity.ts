import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

@Entity({ name: 'animales', schema: 'public' })
export class Animal {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'animales_pkey',
  })
  id: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ type: 'text' })
  especie: string;

  @Column({ type: 'text', nullable: true })
  sexo: string | null;

  @Column({ type: 'integer', nullable: true })
  edad: number | null;

  @Column({ name: 'edad_unidad', type: 'text', nullable: true })
  edadUnidad: string | null;

  @Column({ name: 'fecha_ingreso', type: 'date', nullable: true })
  fechaIngreso: string | null;

  @Column({ type: 'boolean', default: false })
  adoptado: boolean;

  @Column({ name: 'nombre_adoptante', type: 'text', nullable: true })
  nombreAdoptante: string | null;

  @Column({ name: 'direccion_adoptante', type: 'text', nullable: true })
  direccionAdoptante: string | null;

  @Column({ name: 'fecha_adopcion', type: 'date', nullable: true })
  fechaAdopcion: string | null;

  @Column({ name: 'foto_animal_ruta', type: 'text', nullable: true })
  fotoAnimalRuta: string | null;

  @Column({ name: 'foto_animal_content_type', type: 'text', nullable: true })
  fotoAnimalContentType: string | null;

  @Column({ name: 'foto_animal_tamano', type: 'integer', nullable: true })
  fotoAnimalTamano: number | null;

  @Column({ name: 'foto_entrega_ruta', type: 'text', nullable: true })
  fotoEntregaRuta: string | null;

  @Column({ name: 'foto_entrega_content_type', type: 'text', nullable: true })
  fotoEntregaContentType: string | null;

  @Column({ name: 'foto_entrega_tamano', type: 'integer', nullable: true })
  fotoEntregaTamano: number | null;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creado_por',
    foreignKeyConstraintName: 'animales_creado_por_fkey',
  })
  creadoPor: Administrador | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'animales_actualizado_por_fkey',
  })
  actualizadoPor: Administrador | null;

  @Column({ name: 'eliminado_por', type: 'uuid', nullable: true })
  eliminadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'eliminado_por',
    foreignKeyConstraintName: 'animales_eliminado_por_fkey',
  })
  eliminadoPor: Administrador | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn: Date;

  @Column({ name: 'eliminado_en', type: 'timestamptz', nullable: true })
  eliminadoEn: Date | null;
}
