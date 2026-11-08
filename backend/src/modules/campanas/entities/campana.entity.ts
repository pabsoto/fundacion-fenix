import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

export const ESTADOS_CAMPANA = ['borrador', 'publicada', 'cerrada'] as const;
export type EstadoCampana = (typeof ESTADOS_CAMPANA)[number];


@Entity({ name: 'campanas', schema: 'public' })
export class Campana {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'campanas_pkey',
  })
  id: string;

  @Column({ name: 'titulo_es', type: 'text' })
  tituloEs: string;

  @Column({ name: 'titulo_en', type: 'text', nullable: true })
  tituloEn: string | null;

  @Column({ name: 'descripcion_es', type: 'text', nullable: true })
  descripcionEs: string | null;

  @Column({ name: 'descripcion_en', type: 'text', nullable: true })
  descripcionEn: string | null;

  @Column({ type: 'text', nullable: true })
  lugar: string | null;

  @Column({ type: 'date', nullable: true })
  fecha: string | null;

  @Column({ type: 'text', default: 'borrador' })
  estado: EstadoCampana;

  @Column({ name: 'perros_machos', type: 'integer', default: 0 })
  perrosMachos: number;

  @Column({ name: 'perros_hembras', type: 'integer', default: 0 })
  perrosHembras: number;

  @Column({ name: 'gatos_machos', type: 'integer', default: 0 })
  gatosMachos: number;

  @Column({ name: 'gatos_hembras', type: 'integer', default: 0 })
  gatosHembras: number;

  @Column({ name: 'es_historico', type: 'boolean', default: false })
  esHistorico: boolean;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creado_por',
    foreignKeyConstraintName: 'campanas_creado_por_fkey',
  })
  creadoPor: Administrador | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'campanas_actualizado_por_fkey',
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
