import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAreaRequestSupport20260207170000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('permission_request', 'requestedAreaCodes') IS NULL
      BEGIN
        ALTER TABLE [permission_request]
        ADD [requestedAreaCodes] nvarchar(MAX) NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('permission_request', 'requestType') IS NULL
      BEGIN
        ALTER TABLE [permission_request]
        ADD [requestType] varchar(20) NOT NULL
          CONSTRAINT [DF_permission_request_requestType] DEFAULT ('PERMISSIONS')
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_permission_request_requestType'
          AND object_id = OBJECT_ID('[permission_request]')
      )
      BEGIN
        CREATE INDEX [IDX_permission_request_requestType]
        ON [permission_request] ([requestType] ASC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_permission_request_requestType'
          AND object_id = OBJECT_ID('[permission_request]')
      )
      BEGIN
        DROP INDEX [IDX_permission_request_requestType] ON [permission_request]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('permission_request', 'requestType') IS NOT NULL
      BEGIN
        DECLARE @dfName nvarchar(128)
        SELECT @dfName = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('permission_request')
          AND c.name = 'requestType'
        IF @dfName IS NOT NULL EXEC('ALTER TABLE [permission_request] DROP CONSTRAINT [' + @dfName + ']')
        ALTER TABLE [permission_request] DROP COLUMN [requestType]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('permission_request', 'requestedAreaCodes') IS NOT NULL
      BEGIN
        ALTER TABLE [permission_request] DROP COLUMN [requestedAreaCodes]
      END
    `);
  }
}
