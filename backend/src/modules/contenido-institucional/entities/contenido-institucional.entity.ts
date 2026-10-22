import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

@Entity({ name: 'contenido_institucional', schema: 'public' })
@Unique('contenido_institucional_clave_key', ['clave'])
@Check('ck_contenido_clave_formato', `"clave" ~ '^[a-z0-9_]+$'`)
export class ContenidoInstitucional {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'contenido_institucional_pkey',
  })
  id: string;

  @Column({ type: 'text' })
  clave: string;

  @Column({ name: 'titulo_es', type: 'text', nullable: true })
  tituloEs: string | null;

  @Column({ name: 'titulo_en', type: 'text', nullable: true })
  tituloEn: string | null;

  @Column({ name: 'texto_es', type: 'text', nullable: true })
  textoEs: string | null;

  @Column({ name: 'texto_en', type: 'text', nullable: true })
  textoEn: string | null;

  @Column({ name: 'imagen_ruta', type: 'text', nullable: true })
  imagenRuta: string | null;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  visible: boolean;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'contenido_institucional_actualizado_por_fkey',
  })
  actualizadoPor: Administrador | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn: Date;
}
