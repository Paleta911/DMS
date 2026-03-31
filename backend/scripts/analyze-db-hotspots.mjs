import sql from 'mssql';
import { performance } from 'perf_hooks';
import { resolveInfraEnv } from './lib/infra-utils.mjs';

const env = resolveInfraEnv();

function logSection(title) {
  console.log(`\n[db:analyze] ${title}`);
}

async function timedQuery(pool, label, query) {
  const startedAt = performance.now();
  const result = await pool.request().query(query);
  const durationMs = Math.round((performance.now() - startedAt) * 100) / 100;
  const rows = result.recordset?.length ?? 0;
  console.log(`[db:analyze] ${label}: ${durationMs}ms (${rows} row(s))`);
  return result;
}

async function main() {
  const pool = new sql.ConnectionPool({
    server: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPass,
    database: env.dbName,
    connectionTimeout: 5000,
    requestTimeout: 15000,
    options: {
      encrypt: env.dbEncrypt,
      trustServerCertificate: env.dbTrustCert,
    },
  });

  await pool.connect();

  try {
    logSection('row counts');
    const rowCounts = await pool.request().query(`
      SELECT t.name AS tableName, SUM(p.rows) AS [rowCount]
      FROM sys.tables t
      JOIN sys.partitions p ON t.object_id = p.object_id
      WHERE p.index_id IN (0,1)
        AND t.name IN (
          'user',
          'document',
          'version',
          'document_approval',
          'permission_request',
          'audit_log',
          'category',
          'document_type',
          'area_code',
          'search_index_job'
        )
      GROUP BY t.name
      ORDER BY t.name ASC
    `);
    for (const row of rowCounts.recordset ?? []) {
      console.log(`[db:analyze] ${row.tableName}: ${row.rowCount}`);
    }

    logSection('representative queries');
    const firstArea = await pool
      .request()
      .query(`SELECT TOP 1 code FROM [area_code] WHERE [activo] = 1 ORDER BY [code] ASC`);
    const firstAreaCode = firstArea.recordset?.[0]?.code ?? null;
    const firstStatus = await pool
      .request()
      .query(`SELECT TOP 1 [status] FROM [user] ORDER BY [createdAt] DESC`);
    const firstUserStatus = firstStatus.recordset?.[0]?.status ?? 'APPROVED';

    await timedQuery(
      pool,
      'documents/default',
      `
        SELECT TOP 20 d.id, d.nombre, d.createdAt
        FROM [document] d
        ORDER BY d.createdAt DESC
      `,
    );

    await timedQuery(
      pool,
      'documents/sortByName',
      `
        SELECT TOP 20 d.id, d.nombre, d.createdAt
        FROM [document] d
        ORDER BY d.nombre ASC, d.createdAt DESC
      `,
    );

    if (firstAreaCode) {
      await timedQuery(
        pool,
        `documents/byArea(${firstAreaCode})`,
        `
          SELECT TOP 20 d.id, d.nombre, d.createdAt
          FROM [document] d
          INNER JOIN [area_code] a ON a.id = d.areaCodeId
          WHERE a.code = '${String(firstAreaCode).replace(/'/g, "''")}'
          ORDER BY d.createdAt DESC
        `,
      );
    }

    await timedQuery(
      pool,
      `registrations/byStatus(${firstUserStatus})`,
      `
        SELECT TOP 20 u.id, u.email, u.status, u.createdAt
        FROM [user] u
        WHERE u.[status] = '${String(firstUserStatus).replace(/'/g, "''")}'
        ORDER BY u.createdAt DESC
      `,
    );

    await timedQuery(
      pool,
      'permissionRequests/pending',
      `
        SELECT TOP 20 pr.id, pr.[status], pr.requestType, pr.createdAt
        FROM [permission_request] pr
        WHERE pr.[status] = 'PENDING'
        ORDER BY pr.createdAt DESC
      `,
    );

    await timedQuery(
      pool,
      'auditLog/recent',
      `
        SELECT TOP 50 al.id, al.action, al.createdAt
        FROM [audit_log] al
        ORDER BY al.createdAt DESC
      `,
    );

    await timedQuery(
      pool,
      'categories/active',
      `
        SELECT TOP 50 c.id, c.nombre
        FROM [category] c
        WHERE c.activo = 1
        ORDER BY c.nombre ASC
      `,
    );

    await timedQuery(
      pool,
      'documentTypes/active',
      `
        SELECT TOP 50 dt.id, dt.code, dt.nombreLargo
        FROM [document_type] dt
        WHERE dt.activo = 1
        ORDER BY dt.code ASC
      `,
    );

    await timedQuery(
      pool,
      'areaCodes/active',
      `
        SELECT TOP 50 ac.id, ac.code, ac.nombre
        FROM [area_code] ac
        WHERE ac.activo = 1
        ORDER BY ac.code ASC
      `,
    );

    logSection('indexes');
    const indexes = await pool.request().query(`
      SELECT t.name AS tableName, i.name AS indexName
      FROM sys.indexes i
      INNER JOIN sys.tables t ON t.object_id = i.object_id
      WHERE t.name IN ('document', 'category', 'document_type', 'area_code', 'user', 'permission_request', 'audit_log')
        AND i.name IS NOT NULL
      ORDER BY t.name ASC, i.name ASC
    `);
    for (const row of indexes.recordset ?? []) {
      console.log(`[db:analyze] ${row.tableName}: ${row.indexName}`);
    }
  } finally {
    await pool.close();
  }
}

main().catch((error) => {
  console.error(`[db:analyze] failed: ${error.message}`);
  process.exitCode = 1;
});
