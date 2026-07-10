import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRequestedAreaNombreToUser20260404103000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'requestedAreaNombre') IS NULL
      BEGIN
        ALTER TABLE [user]
        ADD [requestedAreaNombre] nvarchar(160) NULL
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF COL_LENGTH('[user]', 'requestedAreaNombre') IS NOT NULL
      BEGIN
        ALTER TABLE [user] DROP COLUMN [requestedAreaNombre]
      END
    `);
  }
}
