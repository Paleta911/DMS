import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDocumentIsInternal20260410121500
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'document',
      new TableColumn({
        name: 'isInternal',
        type: 'bit',
        isNullable: false,
        default: 0,
      }),
    );

    await queryRunner.query(`
      UPDATE document
      SET isInternal = 1
      WHERE codigo IS NOT NULL
         OR documentTypeId IS NOT NULL
         OR consecutivo IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('document', 'isInternal');
  }
}
