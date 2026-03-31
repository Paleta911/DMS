import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSearchIndexJobs20260308193000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF OBJECT_ID('[search_index_job]', 'U') IS NULL
      BEGIN
        CREATE TABLE [search_index_job] (
          [id] int NOT NULL IDENTITY(1,1),
          [documentId] int NOT NULL,
          [status] varchar(20) NOT NULL
            CONSTRAINT [DF_search_index_job_status] DEFAULT ('PENDING'),
          [attempts] int NOT NULL
            CONSTRAINT [DF_search_index_job_attempts] DEFAULT (0),
          [nextAttemptAt] datetime2 NOT NULL
            CONSTRAINT [DF_search_index_job_nextAttemptAt] DEFAULT (GETDATE()),
          [lastError] nvarchar(MAX) NULL,
          [createdAt] datetime2 NOT NULL
            CONSTRAINT [DF_search_index_job_createdAt] DEFAULT (GETDATE()),
          [updatedAt] datetime2 NOT NULL
            CONSTRAINT [DF_search_index_job_updatedAt] DEFAULT (GETDATE()),
          CONSTRAINT [PK_search_index_job_id] PRIMARY KEY ([id]),
          CONSTRAINT [FK_search_index_job_documentId]
            FOREIGN KEY ([documentId]) REFERENCES [document]([id])
            ON DELETE CASCADE
        )
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_search_index_job_documentId'
          AND object_id = OBJECT_ID('[search_index_job]')
      )
      BEGIN
        CREATE UNIQUE INDEX [IDX_search_index_job_documentId]
        ON [search_index_job] ([documentId] ASC)
      END
    `);

    await queryRunner.query(`
      IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_search_index_job_status_nextAttemptAt'
          AND object_id = OBJECT_ID('[search_index_job]')
      )
      BEGIN
        CREATE INDEX [IDX_search_index_job_status_nextAttemptAt]
        ON [search_index_job] ([status] ASC, [nextAttemptAt] ASC)
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_search_index_job_status_nextAttemptAt'
          AND object_id = OBJECT_ID('[search_index_job]')
      )
      BEGIN
        DROP INDEX [IDX_search_index_job_status_nextAttemptAt] ON [search_index_job]
      END
    `);

    await queryRunner.query(`
      IF EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IDX_search_index_job_documentId'
          AND object_id = OBJECT_ID('[search_index_job]')
      )
      BEGIN
        DROP INDEX [IDX_search_index_job_documentId] ON [search_index_job]
      END
    `);

    await queryRunner.query(`
      IF OBJECT_ID('[search_index_job]', 'U') IS NOT NULL
      BEGIN
        DROP TABLE [search_index_job]
      END
    `);
  }
}
