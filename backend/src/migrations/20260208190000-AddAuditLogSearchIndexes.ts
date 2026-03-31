import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogSearchIndexes20260208190000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        CREATE INDEX [IDX_audit_log_createdAt]
        ON [audit_log] ([createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_action_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        CREATE INDEX [IDX_audit_log_action_createdAt]
        ON [audit_log] ([action] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_userId_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        CREATE INDEX [IDX_audit_log_userId_createdAt]
        ON [audit_log] ([userId] ASC, [createdAt] DESC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_resourceType_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        CREATE INDEX [IDX_audit_log_resourceType_createdAt]
        ON [audit_log] ([resourceType] ASC, [createdAt] DESC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_resourceType_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        DROP INDEX [IDX_audit_log_resourceType_createdAt] ON [audit_log]
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_userId_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        DROP INDEX [IDX_audit_log_userId_createdAt] ON [audit_log]
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_action_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        DROP INDEX [IDX_audit_log_action_createdAt] ON [audit_log]
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_audit_log_createdAt'
          AND object_id = OBJECT_ID('[audit_log]')
      )
      BEGIN
        DROP INDEX [IDX_audit_log_createdAt] ON [audit_log]
      END
    `);
  }
}
