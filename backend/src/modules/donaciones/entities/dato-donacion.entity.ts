import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

@Entity({ name: 'datos_donacion', schema: 'public' })
@Index('ux_datos_donacion_un_solo_activo', { synchronize: false })
export class DatoDonacion {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'datos_donacion_pkey',
  })
  id: string;

  @Column({ type: 'text' })
  titular: string;

  @Column({ type: 'text' })
  banco: string;

  @Column({ type: 'text' })
  telefono: string;

  @Column({ type: 'text' })
  referencia: string;

  @Column({ name: 'numero_cuenta', type: 'text', nullable: true })
  numeroCuenta: string | null;

  @Column({ name: 'qr_ruta', type: 'text', nullable: true })
  qrRuta: string | null;

  @Column({ name: 'qr_vence_el', type: 'date', nullable: true })
  qrVenceEl: string | null;

  @Column({ name: 'aviso_es', type: 'text', nullable: true })
  avisoEs: string | null;

  @Column({ name: 'aviso_en', type: 'text', nullable: true })
  avisoEn: string | null;

  @Column({ type: 'boolean', default: false })
  activo: boolean;

  @Column({ name: 'creado_por', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'creado_por',
    foreignKeyConstraintName: 'datos_donacion_creado_por_fkey',
  })
  creadoPor: Administrador | null;

  @Column({ name: 'actualizado_por', type: 'uuid', nullable: true })
  actualizadoPorId: string | null;

  @ManyToOne(() => Administrador, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'actualizado_por',
    foreignKeyConstraintName: 'datos_donacion_actualizado_por_fkey',
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
