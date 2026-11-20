import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

@Entity({ name: 'historias', schema: 'public' })
export class Historia {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'historias_pkey',
  })
  id: string;

  @Column({ name: 'animal_nombre', type: 'text' })
  animalNombre: string;

  @Column({ name: 'titulo_es', type: 'text' })
  tituloEs: string;

  @Column({ name: 'titulo_en', type: 'text' })
  tituloEn: string;

  @Column({ name: 'texto_es', type: 'text' })
  textoEs: string;

  @Column({ name: 'texto_en', type: 'text' })
  textoEn: string;

  @Column({ name: 'autor_nombre', type: 'text', nullable: true })
  autorNombre: string | null;

  /** Fecha que se muestra al público (formato `YYYY-MM-DD`). */
  @Column({ name: 'fecha_historia', type: 'date' })
  fechaHistoria: string;

  @Column({ name: 'foto_ruta', type: 'text', nullable: true })
  fotoRuta: string | null;

  @Column({ name: 'foto_content_type', type: 'text', nullable: true })
  fotoContentType: string | null;

  @Column({ name: 'foto_tamano', type: 'integer', nullable: true })
  fotoTamano: number | null;

  @Column({ name: 'foto_ancho', type: 'integer', nullable: true })
  fotoAncho: number | null;

  @Column({ name: 'foto_alto', type: 'integer', nullable: true })
  fotoAlto: number | null;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: false })
  visible: boolean;

  /** Solo registro interno: nunca se expone en la API pública. */
  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creado_por',
    foreignKeyConstraintName: 'historias_creado_por_fkey',
  })
  creadoPor: Administrador | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'historias_actualizado_por_fkey',
  })
  actualizadoPor: Administrador | null;

  @Column({ name: 'eliminado_por', type: 'uuid', nullable: true })
  eliminadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'eliminado_por',
    foreignKeyConstraintName: 'historias_eliminado_por_fkey',
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
