import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class InitialSchema20260118211500 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'email', type: 'varchar', isNullable: false },
          { name: 'passwordHash', type: 'varchar', isNullable: false },
          { name: 'role', type: 'varchar', isNullable: false, default: "'user'" },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('user', new TableIndex({ name: 'IDX_user_email', columnNames: ['email'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'category',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'nombre', type: 'varchar', isNullable: false },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('category', new TableIndex({ name: 'IDX_category_nombre', columnNames: ['nombre'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'document_type',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'code', type: 'varchar', isNullable: false },
          { name: 'nombreLargo', type: 'varchar', isNullable: false },
          { name: 'activo', type: 'bit', default: '1' },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('document_type', new TableIndex({ name: 'IDX_document_type_code', columnNames: ['code'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'area_code',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'code', type: 'varchar', isNullable: false },
          { name: 'nombre', type: 'varchar', isNullable: false },
          { name: 'activo', type: 'bit', default: '1' },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('area_code', new TableIndex({ name: 'IDX_area_code_code', columnNames: ['code'], isUnique: true }));

    await queryRunner.createTable(
      new Table({
        name: 'document',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'nombre', type: 'varchar', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false, default: "'DRAFT'" },
          { name: 'documentTypeId', type: 'int', isNullable: true },
          { name: 'areaCodeId', type: 'int', isNullable: true },
          { name: 'consecutivo', type: 'int', isNullable: true },
          { name: 'codigo', type: 'varchar', isNullable: true },
          { name: 'categoryId', type: 'int', isNullable: true },
          { name: 'createdById', type: 'int', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
          { name: 'updatedAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex('document', new TableIndex({ name: 'IDX_document_codigo', columnNames: ['codigo'], isUnique: true }));
    await queryRunner.createForeignKeys('document', [
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedTableName: 'category',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['documentTypeId'],
        referencedTableName: 'document_type',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['areaCodeId'],
        referencedTableName: 'area_code',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
      new TableForeignKey({
        columnNames: ['createdById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'version',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'storedName', type: 'varchar', isNullable: false },
          { name: 'originalName', type: 'varchar', isNullable: false },
          { name: 'comentario', type: 'nvarchar', isNullable: true },
          { name: 'contentText', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
          { name: 'documentId', type: 'int', isNullable: false },
          { name: 'uploadedById', type: 'int', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKeys('version', [
      new TableForeignKey({
        columnNames: ['documentId'],
        referencedTableName: 'document',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['uploadedById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'document_approval',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'documentId', type: 'int', isNullable: false },
          { name: 'step', type: 'varchar', isNullable: false },
          { name: 'userId', type: 'int', isNullable: true },
          { name: 'decision', type: 'varchar', isNullable: false },
          { name: 'comentario', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'decidedAt', type: 'datetime2', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKeys('document_approval', [
      new TableForeignKey({
        columnNames: ['documentId'],
        referencedTableName: 'document',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'audit_log',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isNullable: true },
          { name: 'action', type: 'varchar', isNullable: false },
          { name: 'resourceType', type: 'varchar', isNullable: false },
          { name: 'resourceId', type: 'varchar', isNullable: true },
          { name: 'meta', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'ip', type: 'varchar', isNullable: true },
          { name: 'userAgent', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKey(
      'audit_log',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'user_area_codes',
        columns: [
          { name: 'userId', type: 'int', isPrimary: true },
          { name: 'areaCodeId', type: 'int', isPrimary: true },
        ],
      }),
      true,
    );
    await queryRunner.createForeignKeys('user_area_codes', [
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['areaCodeId'],
        referencedTableName: 'area_code',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('user_area_codes', true);
    await queryRunner.dropTable('audit_log', true);
    await queryRunner.dropTable('document_approval', true);
    await queryRunner.dropTable('version', true);
    await queryRunner.dropTable('document', true);
    await queryRunner.dropTable('area_code', true);
    await queryRunner.dropTable('document_type', true);
    await queryRunner.dropTable('category', true);
    await queryRunner.dropTable('user', true);
  }
}
