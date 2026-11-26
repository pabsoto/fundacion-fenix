import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Corrige `ck_animales_edad_unidad`: con una edad y sin unidad, la condición
 * anterior se evaluaba a `NULL` y PostgreSQL daba la fila por válida.
 */
export class ExigirUnidadDeEdad1735000000000 implements MigrationInterface {
  name = 'ExigirUnidadDeEdad1735000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La unidad no se puede deducir: esas filas se corrigen a mano.
    const [{ total }] = await queryRunner.query(`
      SELECT count(*)::int AS total
        FROM public.animales
       WHERE edad IS NOT NULL AND edad_unidad IS NULL
    `);
    if (total > 0) {
      throw new Error(
        `Hay ${total} animales con edad y sin unidad (incluidos los eliminados). Complete edad_unidad antes de migrar`,
      );
    }

    await this.redefinir(
      queryRunner,
      `(edad IS NULL AND edad_unidad IS NULL)
       OR (edad IS NOT NULL AND edad_unidad IS NOT NULL
           AND edad_unidad IN ('anios', 'meses'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.redefinir(
      queryRunner,
      `(edad IS NULL AND edad_unidad IS NULL)
       OR (edad IS NOT NULL AND edad_unidad IN ('anios', 'meses'))`,
    );
  }

  /** Cambia la restricción en una sola sentencia: nunca queda sin ella. */
  private async redefinir(
    queryRunner: QueryRunner,
    condicion: string,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.animales
        DROP CONSTRAINT IF EXISTS ck_animales_edad_unidad,
        ADD CONSTRAINT ck_animales_edad_unidad CHECK (${condicion})
    `);
  }
}
