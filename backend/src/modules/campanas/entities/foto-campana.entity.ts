import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';
import { Campana } from './campana.entity.js';

@Entity({ name: 'fotos_campana', schema: 'public' })
export class FotoCampana {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'fotos_campana_pkey',
  })
  id: string;

  @Column({ name: 'campana_id', type: 'uuid' })
  campanaId: string;

  @ManyToOne(() => Campana, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'campana_id',
    foreignKeyConstraintName: 'fotos_campana_campana_id_fkey',
  })
  campana: Campana;

  @Column({ type: 'text' })
  ruta: string;

  @Column({ name: 'content_type', type: 'text' })
  contentType: string;

  @Column({ type: 'integer' })
  tamano: number;

  @Column({ type: 'integer' })
  orden: number;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creado_por',
    foreignKeyConstraintName: 'fotos_campana_creado_por_fkey',
  })
  creadoPor: Administrador | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;
}
