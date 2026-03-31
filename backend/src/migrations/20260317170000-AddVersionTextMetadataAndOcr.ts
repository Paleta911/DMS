import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionTextMetadataAndOcr20260317170000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'textSource') IS NULL
      BEGIN
        ALTER TABLE [version]
        ADD [textSource] nvarchar(20) NOT NULL
          CONSTRAINT [DF_version_textSource] DEFAULT('NONE') WITH VALUES
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'ocrApplied') IS NULL
      BEGIN
        ALTER TABLE [version]
        ADD [ocrApplied] bit NOT NULL
          CONSTRAINT [DF_version_ocrApplied] DEFAULT(0) WITH VALUES
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'ocrPageCount') IS NULL
      BEGIN
        ALTER TABLE [version]
        ADD [ocrPageCount] int NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'ocrPageCount') IS NOT NULL
      BEGIN
        ALTER TABLE [version] DROP COLUMN [ocrPageCount]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'ocrApplied') IS NOT NULL
      BEGIN
        DECLARE @ocrAppliedConstraint NVARCHAR(128);
        SELECT @ocrAppliedConstraint = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('[version]')
          AND c.name = 'ocrApplied';

        IF @ocrAppliedConstraint IS NOT NULL
        BEGIN
          EXEC('ALTER TABLE [version] DROP CONSTRAINT [' + @ocrAppliedConstraint + ']');
        END

        ALTER TABLE [version] DROP COLUMN [ocrApplied]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[version]', 'textSource') IS NOT NULL
      BEGIN
        DECLARE @textSourceConstraint NVARCHAR(128);
        SELECT @textSourceConstraint = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('[version]')
          AND c.name = 'textSource';

        IF @textSourceConstraint IS NOT NULL
        BEGIN
          EXEC('ALTER TABLE [version] DROP CONSTRAINT [' + @textSourceConstraint + ']');
        END

        ALTER TABLE [version] DROP COLUMN [textSource]
      END
    `);
  }
}
