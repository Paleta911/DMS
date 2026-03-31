import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixNullableDocumentCodigoIndex20260324223000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_b5dfcc63ef63473e36faf7b0da'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        DROP INDEX [IDX_b5dfcc63ef63473e36faf7b0da] ON [document];
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_codigo'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        DROP INDEX [IDX_document_codigo] ON [document];
      END
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [IDX_document_codigo]
      ON [document] ([codigo])
      WHERE [codigo] IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_codigo'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        DROP INDEX [IDX_document_codigo] ON [document];
      END
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [IDX_b5dfcc63ef63473e36faf7b0da]
      ON [document] ([codigo])
    `);
  }
}
