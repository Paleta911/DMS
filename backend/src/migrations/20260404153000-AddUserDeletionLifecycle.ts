import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
} from 'typeorm';

export class AddUserDeletionLifecycle20260404153000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE [user]
      ADD [deletedAt] datetime NULL
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      ADD [deletedById] int NULL
    `);

    await queryRunner.createTable(
      new Table({
        name: 'deleted_user_record',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '254',
            isNullable: false,
          },
          {
            name: 'nombre',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'primerApellido',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'segundoApellido',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'originalUserId',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'lastKnownStatus',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'deletedById',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'deletedAt',
            type: 'datetime',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndices('deleted_user_record', [
      new TableIndex({
        name: 'IDX_deleted_user_record_email',
        columnNames: ['email'],
        isUnique: true,
      }),
      new TableIndex({
        name: 'IDX_deleted_user_record_original_user_id',
        columnNames: ['originalUserId'],
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('deleted_user_record', true);

    await queryRunner.query(`
      ALTER TABLE [user]
      DROP COLUMN [deletedById]
    `);

    await queryRunner.query(`
      ALTER TABLE [user]
      DROP COLUMN [deletedAt]
    `);
  }
}
