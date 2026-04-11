import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddDocumentVisibilityPolicy20260410103000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'document_visibility_policy',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
          },
          {
            name: 'draftVisibleToUsers',
            type: 'bit',
            default: 1,
          },
          {
            name: 'inReviewVisibleToUsers',
            type: 'bit',
            default: 1,
          },
          {
            name: 'approvedVisibleToUsers',
            type: 'bit',
            default: 1,
          },
          {
            name: 'obsoleteVisibleToUsers',
            type: 'bit',
            default: 1,
          },
          {
            name: 'updatedAt',
            type: 'datetime2',
            default: 'SYSUTCDATETIME()',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(`
      INSERT INTO [document_visibility_policy] (
        [id],
        [draftVisibleToUsers],
        [inReviewVisibleToUsers],
        [approvedVisibleToUsers],
        [obsoleteVisibleToUsers]
      ) VALUES (1, 1, 1, 1, 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('document_visibility_policy', true);
  }
}
