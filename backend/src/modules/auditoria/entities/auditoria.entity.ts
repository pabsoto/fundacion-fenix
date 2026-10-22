import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

export type AccionAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

@Entity({ name: 'auditoria', schema: 'public' })
@Index('ix_auditoria_creado_en', { synchronize: false })
@Index('ix_auditoria_tabla_registro', ['tabla', 'registroId'])
@Check('ck_auditoria_accion', `"accion" IN ('INSERT', 'UPDATE', 'DELETE')`)
export class Auditoria {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'auditoria_pkey',
  })
  id: string;

  @Column({ name: 'administrador_id', type: 'uuid', nullable: true })
  administradorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'administrador_id',
    foreignKeyConstraintName: 'auditoria_administrador_id_fkey',
  })
  administrador: Administrador | null;

  @Column({ type: 'text' })
  tabla: string;

  @Column({ name: 'registro_id', type: 'uuid', nullable: true })
  registroId: string | null;

  @Column({ type: 'text' })
  accion: AccionAuditoria;

  @Column({
    name: 'campos_modificados',
    type: 'text',
    array: true,
    nullable: true,
  })
  camposModificados: string[] | null;

  @Column({ name: 'datos_antes', type: 'jsonb', nullable: true })
  datosAntes: Record<string, unknown> | null;

  @Column({ name: 'datos_despues', type: 'jsonb', nullable: true })
  datosDespues: Record<string, unknown> | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;
}
