import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogArchiveAndNameIndexes20260310003000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('category', 'activo') IS NULL
      BEGIN
        ALTER TABLE [category]
        ADD [activo] bit NOT NULL CONSTRAINT [DF_category_activo] DEFAULT(1) WITH VALUES
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_category_activo_nombre'
          AND object_id = OBJECT_ID('[category]')
      )
      BEGIN
        CREATE INDEX [IDX_category_activo_nombre]
        ON [category] ([activo] ASC, [nombre] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_type_activo_nombreLargo'
          AND object_id = OBJECT_ID('[document_type]')
      )
      BEGIN
        CREATE INDEX [IDX_document_type_activo_nombreLargo]
        ON [document_type] ([activo] ASC, [nombreLargo] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_area_code_activo_nombre'
          AND object_id = OBJECT_ID('[area_code]')
      )
      BEGIN
        CREATE INDEX [IDX_area_code_activo_nombre]
        ON [area_code] ([activo] ASC, [nombre] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_nombre_createdAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_nombre_createdAt]
        ON [document] ([nombre] ASC, [createdAt] DESC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const drops = [
      ['document', 'IDX_document_nombre_createdAt'],
      ['area_code', 'IDX_area_code_activo_nombre'],
      ['document_type', 'IDX_document_type_activo_nombreLargo'],
      ['category', 'IDX_category_activo_nombre'],
    ] as const;

    for (const [table, index] of drops) {
      await queryRunner.query(`
        IF EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = '${index}'
            AND object_id = OBJECT_ID('[${table}]')
        )
        BEGIN
          DROP INDEX [${index}] ON [${table}]
        END
      `);
    }

    await queryRunner.query(`
      IF COL_LENGTH('category', 'activo') IS NOT NULL
      BEGIN
        DECLARE @constraintName NVARCHAR(128);
        SELECT @constraintName = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('[category]')
          AND c.name = 'activo';

        IF @constraintName IS NOT NULL
        BEGIN
          EXEC('ALTER TABLE [category] DROP CONSTRAINT [' + @constraintName + ']');
        END

        ALTER TABLE [category] DROP COLUMN [activo]
      END
    `);
  }
}
