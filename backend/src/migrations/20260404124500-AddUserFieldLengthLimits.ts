import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFieldLengthLimits20260404124500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_email'
          AND object_id = OBJECT_ID('[user]')
      )
      DROP INDEX [IDX_user_email] ON [user]
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [email] varchar(254) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [nombre] varchar(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [primerApellido] varchar(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [segundoApellido] varchar(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [telefono] varchar(15) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [IDX_user_email]
      ON [user] ([email])
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_user_email'
          AND object_id = OBJECT_ID('[user]')
      )
      DROP INDEX [IDX_user_email] ON [user]
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [email] varchar(255) NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [nombre] varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [primerApellido] varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [segundoApellido] varchar(255) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ALTER COLUMN [telefono] varchar(255) NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX [IDX_user_email]
      ON [user] ([email])
    `);
  }
}
