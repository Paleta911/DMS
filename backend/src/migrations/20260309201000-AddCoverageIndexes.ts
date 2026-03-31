import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverageIndexes20260309201000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_documentTypeId_createdAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_documentTypeId_createdAt]
        ON [document] ([documentTypeId] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_categoryId_createdAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_categoryId_createdAt]
        ON [document] ([categoryId] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_updatedAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_updatedAt]
        ON [document] ([updatedAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_area_codes_areaCodeId_userId'
          AND object_id = OBJECT_ID('[user_area_codes]')
      )
      BEGIN
        CREATE INDEX [IDX_user_area_codes_areaCodeId_userId]
        ON [user_area_codes] ([areaCodeId] ASC, [userId] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_type_activo_code'
          AND object_id = OBJECT_ID('[document_type]')
      )
      BEGIN
        CREATE INDEX [IDX_document_type_activo_code]
        ON [document_type] ([activo] ASC, [code] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_area_code_activo_code'
          AND object_id = OBJECT_ID('[area_code]')
      )
      BEGIN
        CREATE INDEX [IDX_area_code_activo_code]
        ON [area_code] ([activo] ASC, [code] ASC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const drops = [
      ['area_code', 'IDX_area_code_activo_code'],
      ['document_type', 'IDX_document_type_activo_code'],
      ['user_area_codes', 'IDX_user_area_codes_areaCodeId_userId'],
      ['document', 'IDX_document_updatedAt'],
      ['document', 'IDX_document_categoryId_createdAt'],
      ['document', 'IDX_document_documentTypeId_createdAt'],
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
  }
}
