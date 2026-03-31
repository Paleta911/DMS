import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionLatestLookupIndex20260207143000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_version_documentId_id_desc'
          AND object_id = OBJECT_ID('[version]')
      )
      BEGIN
        CREATE INDEX [IDX_version_documentId_id_desc]
        ON [version] ([documentId] ASC, [id] DESC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_version_documentId_id_desc'
          AND object_id = OBJECT_ID('[version]')
      )
      BEGIN
        DROP INDEX [IDX_version_documentId_id_desc] ON [version]
      END
    `);
  }
}
