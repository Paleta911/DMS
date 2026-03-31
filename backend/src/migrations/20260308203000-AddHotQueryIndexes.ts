import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHotQueryIndexes20260308203000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_createdAt'
          AND object_id = OBJECT_ID('[user]')
      )
      BEGIN
        CREATE INDEX [IDX_user_createdAt]
        ON [user] ([createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_status_createdAt'
          AND object_id = OBJECT_ID('[user]')
      )
      BEGIN
        CREATE INDEX [IDX_user_status_createdAt]
        ON [user] ([status] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_role'
          AND object_id = OBJECT_ID('[user]')
      )
      BEGIN
        CREATE INDEX [IDX_user_role]
        ON [user] ([role] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_permission_request_user_createdAt'
          AND object_id = OBJECT_ID('[permission_request]')
      )
      BEGIN
        CREATE INDEX [IDX_permission_request_user_createdAt]
        ON [permission_request] ([userId] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_permission_request_status_type_createdAt'
          AND object_id = OBJECT_ID('[permission_request]')
      )
      BEGIN
        CREATE INDEX [IDX_permission_request_status_type_createdAt]
        ON [permission_request] ([status] ASC, [requestType] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_permission_request_user_status_type_createdAt'
          AND object_id = OBJECT_ID('[permission_request]')
      )
      BEGIN
        CREATE INDEX [IDX_permission_request_user_status_type_createdAt]
        ON [permission_request] ([userId] ASC, [status] ASC, [requestType] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_approval_user_step_decision'
          AND object_id = OBJECT_ID('[document_approval]')
      )
      BEGIN
        CREATE INDEX [IDX_document_approval_user_step_decision]
        ON [document_approval] ([userId] ASC, [step] ASC, [decision] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_approval_document_createdAt'
          AND object_id = OBJECT_ID('[document_approval]')
      )
      BEGIN
        CREATE INDEX [IDX_document_approval_document_createdAt]
        ON [document_approval] ([documentId] ASC, [createdAt] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_version_documentId_createdAt'
          AND object_id = OBJECT_ID('[version]')
      )
      BEGIN
        CREATE INDEX [IDX_version_documentId_createdAt]
        ON [version] ([documentId] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_createdAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_createdAt]
        ON [document] ([createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_document_areaCodeId_createdAt'
          AND object_id = OBJECT_ID('[document]')
      )
      BEGIN
        CREATE INDEX [IDX_document_areaCodeId_createdAt]
        ON [document] ([areaCodeId] ASC, [createdAt] DESC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const drops = [
      ['document', 'IDX_document_areaCodeId_createdAt'],
      ['document', 'IDX_document_createdAt'],
      ['version', 'IDX_version_documentId_createdAt'],
      ['document_approval', 'IDX_document_approval_document_createdAt'],
      ['document_approval', 'IDX_document_approval_user_step_decision'],
      ['permission_request', 'IDX_permission_request_user_status_type_createdAt'],
      ['permission_request', 'IDX_permission_request_status_type_createdAt'],
      ['permission_request', 'IDX_permission_request_user_createdAt'],
      ['user', 'IDX_user_role'],
      ['user', 'IDX_user_status_createdAt'],
      ['user', 'IDX_user_createdAt'],
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
