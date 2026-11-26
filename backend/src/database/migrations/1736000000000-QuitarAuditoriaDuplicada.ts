import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Tablas que el backend ya audita dentro de la transacción de cada cambio. */
const TABLAS = ['campanas', 'canales_contacto', 'datos_donacion'] as const;

/**
 * Quita los disparadores de auditoría de las tablas que además audita el
 * backend, porque cada cambio quedaba registrado dos veces.
 *
 * Consecuencia: los cambios hechos directamente en la base sobre estas tablas
 * ya no se auditan. `administradores` e `historias` conservan su disparador:
 * son su única auditoría. Las filas duplicadas que ya existen no se borran.
 */
export class QuitarAuditoriaDuplicada1736000000000 implements MigrationInterface {
  name = 'QuitarAuditoriaDuplicada1736000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tabla of TABLAS) {
      await queryRunner.query(
        `DROP TRIGGER IF EXISTS trg_${tabla}_auditoria ON public.${tabla}`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tabla of TABLAS) {
      await queryRunner.query(`
        CREATE TRIGGER trg_${tabla}_auditoria
          AFTER INSERT OR DELETE OR UPDATE ON public.${tabla}
          FOR EACH ROW EXECUTE FUNCTION public.fn_registrar_auditoria('completo')
      `);
    }
  }
}
