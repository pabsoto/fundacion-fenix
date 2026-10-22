import { Check, Column, Entity, PrimaryColumn, Unique } from 'typeorm';

@Entity({ name: 'administradores', schema: 'public' })
@Unique('administradores_email_key', ['email'])
@Unique('administradores_google_sub_key', ['googleSub'])
@Check('ck_administradores_email_minuscula', `"email" = lower("email")`)
@Check('ck_administradores_nombre_no_vacio', `length(btrim("nombre")) > 0`)
export class Administrador {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'administradores_pkey',
  })
  id: string;

  @Column({ type: 'text' })
  email: string;

  @Column({ type: 'text' })
  nombre: string;

  @Column({ name: 'google_sub', type: 'text', nullable: true })
  googleSub: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'ultimo_acceso', type: 'timestamptz', nullable: true })
  ultimoAcceso: Date | null;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn: Date;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn: Date;
}
