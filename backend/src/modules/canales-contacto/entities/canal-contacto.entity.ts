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

export type TipoCanalContacto =
  'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'email';

@Entity({ name: 'canales_contacto', schema: 'public' })
@Unique('canales_contacto_tipo_key', ['tipo'])
@Check(
  'ck_canales_tipo',
  `"tipo" IN ('whatsapp', 'facebook', 'instagram', 'tiktok', 'email')`,
)
@Check('ck_canales_url_segura', `"url" ~* '^(https?://|mailto:)'`)
export class CanalContacto {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'canales_contacto_pkey',
  })
  id: string;

  @Column({ type: 'text' })
  tipo: TipoCanalContacto;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'texto_es', type: 'text', nullable: true })
  textoEs: string | null;

  @Column({ name: 'texto_en', type: 'text', nullable: true })
  textoEn: string | null;

  @Column({ type: 'integer', default: 0 })
  orden: number;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'canales_contacto_actualizado_por_fkey',
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
