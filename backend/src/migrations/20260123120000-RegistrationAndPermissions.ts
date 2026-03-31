import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RegistrationAndPermissions20260123120000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user', [
      new TableColumn({ name: 'nombre', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'primerApellido', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'segundoApellido', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'telefono', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'fechaNacimiento', type: 'date', isNullable: true }),
      new TableColumn({
        name: 'status',
        type: 'varchar',
        default: "'PENDING_VERIFICATION'",
      }),
      new TableColumn({ name: 'verifiedAt', type: 'datetime2', isNullable: true }),
      new TableColumn({ name: 'approvedAt', type: 'datetime2', isNullable: true }),
      new TableColumn({ name: 'approvedById', type: 'int', isNullable: true }),
      new TableColumn({ name: 'rejectedAt', type: 'datetime2', isNullable: true }),
      new TableColumn({
        name: 'rejectedReason',
        type: 'nvarchar',
        length: 'MAX',
        isNullable: true,
      }),
      new TableColumn({ name: 'isSuperAdmin', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canAccess', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canRead', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canUpload', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canUploadNewVersion', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canReview', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canApprove', type: 'bit', default: '0' }),
      new TableColumn({ name: 'canDelete', type: 'bit', default: '0' }),
    ]);

    await queryRunner.createForeignKey(
      'user',
      new TableForeignKey({
        columnNames: ['approvedById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );

    await queryRunner.query(
      "UPDATE [user] SET status = 'APPROVED', canAccess = 1, canRead = 1, canUpload = 1, canUploadNewVersion = 1, canReview = 1, canApprove = 1, canDelete = 1",
    );
    await queryRunner.query(
      "UPDATE [user] SET isSuperAdmin = 1 WHERE id = (SELECT MIN(id) FROM [user] WHERE role = 'admin')",
    );

    await queryRunner.createTable(
      new Table({
        name: 'email_verification',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'codeHash', type: 'varchar', isNullable: false },
          { name: 'expiresAt', type: 'datetime2', isNullable: false },
          { name: 'sendStatus', type: 'varchar', isNullable: false, default: "'PENDING'" },
          { name: 'sendAttempts', type: 'int', default: '0' },
          { name: 'lastError', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'sentAt', type: 'datetime2', isNullable: true },
          { name: 'verifyAttempts', type: 'int', default: '0' },
          { name: 'lastAttemptAt', type: 'datetime2', isNullable: true },
          { name: 'lastAttemptIp', type: 'varchar', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
          { name: 'updatedAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'email_verification',
      new TableIndex({ name: 'IDX_email_verification_user', columnNames: ['userId'], isUnique: true }),
    );
    await queryRunner.createForeignKey(
      'email_verification',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'permission_request',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'userId', type: 'int', isNullable: false },
          { name: 'requestedPermissions', type: 'nvarchar', length: 'MAX', isNullable: false },
          { name: 'comment', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'status', type: 'varchar', isNullable: false, default: "'PENDING'" },
          { name: 'reviewedById', type: 'int', isNullable: true },
          { name: 'reviewedAt', type: 'datetime2', isNullable: true },
          { name: 'reviewReason', type: 'nvarchar', length: 'MAX', isNullable: true },
          { name: 'createdAt', type: 'datetime2', default: 'GETDATE()' },
          { name: 'updatedAt', type: 'datetime2', default: 'GETDATE()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'permission_request',
      new TableIndex({ name: 'IDX_permission_request_status', columnNames: ['status'] }),
    );
    await queryRunner.createForeignKeys('permission_request', [
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['reviewedById'],
        referencedTableName: 'user',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('permission_request', true);
    await queryRunner.dropTable('email_verification', true);

    const table = await queryRunner.getTable('user');
    if (table) {
      const fk = table.foreignKeys.find((key) => key.columnNames.includes('approvedById'));
      if (fk) {
        await queryRunner.dropForeignKey('user', fk);
      }
    }

    await queryRunner.dropColumns('user', [
      'nombre',
      'primerApellido',
      'segundoApellido',
      'telefono',
      'fechaNacimiento',
      'status',
      'verifiedAt',
      'approvedAt',
      'approvedById',
      'rejectedAt',
      'rejectedReason',
      'isSuperAdmin',
      'canAccess',
      'canRead',
      'canUpload',
      'canUploadNewVersion',
      'canReview',
      'canApprove',
      'canDelete',
    ]);
  }
}
