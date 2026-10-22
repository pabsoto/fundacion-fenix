import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Administrador } from '../../administradores/entities/administrador.entity.js';

/**
 * Sesión administrativa persistida en PostgreSQL.
 *
 * El navegador nunca recibe información de esta tabla: sólo un identificador
 * opaco (`token`) que se guarda en la cookie. En la base de datos se almacena
 * **únicamente el resumen SHA-256** de ese identificador, de modo que un
 * volcado de la tabla no permite suplantar una sesión.
 *
 * El token CSRF se almacena en claro porque el servidor debe poder devolverlo
 * al frontend en la consulta de sesión actual. No es una credencial de
 * autenticación: sin la cookie de sesión no permite acceder a ningún recurso.
 *
 * La tabla se crea con la migración `CrearTablaSesionesAdmin`, que está
 * pendiente de autorización para aplicarse en Supabase. La migración activa
 * Row Level Security y revoca los permisos de `anon`, `authenticated` y
 * `PUBLIC`: la tabla no es accesible desde la Data API de Supabase.
 */
@Unique('sesiones_admin_token_hash_key', ['tokenHash'])
@Check(
  'ck_sesiones_admin_expira_posterior_creacion',
  `"expira_en" > "creada_en"`,
)
@Check(
  'ck_sesiones_admin_revocation_coherente',
  `("revocada_en" IS NULL) = ("motivo_revocacion" IS NULL)`,
)
@Check(
  'ck_sesiones_admin_token_hash_formato',
  `"token_hash" ~ '^[0-9a-f]{64}$'`,
)
@Check(
  'ck_sesiones_admin_csrf_token_formato',
  `length("csrf_token") BETWEEN 32 AND 128`,
)
@Entity({ name: 'sesiones_admin', schema: 'public' })
export class SesionAdmin {
  @PrimaryColumn({
    type: 'uuid',
    default: () => 'gen_random_uuid()',
    primaryKeyConstraintName: 'sesiones_admin_pkey',
  })
  id: string;

  /**
   * Administrador propietario de la sesión.
   *
   * La clave foránea se crea en la migración con `ON DELETE CASCADE`: al
   * eliminar un administrador sus sesiones desaparecen con él, de modo que
   * nunca puede quedar una sesión huérfana apuntando a una cuenta inexistente.
   *
   * Se declara además la relación para que la entidad y la base de datos
   * descreban la misma clave foránea (mismo patrón que `auditoria` y
   * `datos_donacion`).
   */
  @Index('ix_sesiones_admin_administrador_id')
  @Column({ name: 'administrador_id', type: 'uuid' })
  administradorId: string;

  @ManyToOne(() => Administrador, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({
    name: 'administrador_id',
    foreignKeyConstraintName: 'fk_sesiones_admin_administrador',
  })
  administrador: Administrador;

  /** Resumen SHA-256 en hexadecimal del identificador de sesión. */
  @Column({ name: 'token_hash', type: 'text' })
  tokenHash: string;

  /** Token anti-CSRF asociado a la sesión. */
  @Column({ name: 'csrf_token', type: 'text' })
  csrfToken: string;

  @Column({ name: 'creada_en', type: 'timestamptz', default: () => 'now()' })
  creadaEn: Date;

  /** Instante en que se emitió el identificador de sesión vigente. */
  @Column({
    name: 'token_emitido_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  tokenEmitidoEn: Date;

  /** Última actividad del administrador: se actualiza en cada petición válida. */
  @Column({
    name: 'ultima_actividad_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  ultimaActividadEn: Date;

  /** Caducidad máxima absoluta de la sesión. */
  @Index('ix_sesiones_admin_expira_en')
  @Column({ name: 'expira_en', type: 'timestamptz' })
  expiraEn: Date;

  /** Instante de revocación; `null` mientras la sesión está activa. */
  @Column({ name: 'revocada_en', type: 'timestamptz', nullable: true })
  revocadaEn: Date | null;

  /** Motivo de la revocación (`logout`, `administrador_inactivo`). */
  @Column({ name: 'motivo_revocacion', type: 'text', nullable: true })
  motivoRevocacion: string | null;
}
