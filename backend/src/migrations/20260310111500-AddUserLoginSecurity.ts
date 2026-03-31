import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserLoginSecurity20260310111500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'failedLoginAttempts') IS NULL
      BEGIN
        ALTER TABLE [user]
        ADD [failedLoginAttempts] int NOT NULL
          CONSTRAINT [DF_user_failedLoginAttempts] DEFAULT(0) WITH VALUES
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'lastFailedLoginAt') IS NULL
      BEGIN
        ALTER TABLE [user]
        ADD [lastFailedLoginAt] datetime NULL
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'loginBlockedUntil') IS NULL
      BEGIN
        ALTER TABLE [user]
        ADD [loginBlockedUntil] datetime NULL
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_loginBlockedUntil_status'
          AND object_id = OBJECT_ID('[user]')
      )
      BEGIN
        CREATE INDEX [IDX_user_loginBlockedUntil_status]
        ON [user] ([loginBlockedUntil] ASC, [status] ASC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_loginBlockedUntil_status'
          AND object_id = OBJECT_ID('[user]')
      )
      BEGIN
        DROP INDEX [IDX_user_loginBlockedUntil_status] ON [user]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'loginBlockedUntil') IS NOT NULL
      BEGIN
        ALTER TABLE [user] DROP COLUMN [loginBlockedUntil]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'lastFailedLoginAt') IS NOT NULL
      BEGIN
        ALTER TABLE [user] DROP COLUMN [lastFailedLoginAt]
      END
    `);

    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'failedLoginAttempts') IS NOT NULL
      BEGIN
        DECLARE @constraintName NVARCHAR(128);
        SELECT @constraintName = dc.name
        FROM sys.default_constraints dc
        INNER JOIN sys.columns c
          ON c.default_object_id = dc.object_id
        WHERE dc.parent_object_id = OBJECT_ID('[user]')
          AND c.name = 'failedLoginAttempts';

        IF @constraintName IS NOT NULL
        BEGIN
          EXEC('ALTER TABLE [user] DROP CONSTRAINT [' + @constraintName + ']');
        END

        ALTER TABLE [user] DROP COLUMN [failedLoginAttempts]
      END
    `);
  }
}
