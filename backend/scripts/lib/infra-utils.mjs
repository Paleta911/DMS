import path from 'path';
import sql from 'mssql';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: path.resolve(__dirname, '..', '..', '.env') });

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value, fallback) {
  if (value == null || value === '') {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return fallback;
}

export function resolveInfraEnv() {
  return {
    dbHost: process.env.DB_HOST ?? 'localhost',
    dbPort: toNumber(process.env.DB_PORT, 1433),
    dbUser: process.env.DB_USER ?? 'sa',
    dbPass: process.env.DB_PASS ?? process.env.MSSQL_SA_PASSWORD ?? '',
    dbName: process.env.DB_NAME ?? 'DMS',
    dbEncrypt: toBool(process.env.DB_ENCRYPT, false),
    dbTrustCert: toBool(process.env.DB_TRUST_CERT, true),
    esNode: process.env.ES_NODE ?? 'http://127.0.0.1:9200',
  };
}

export async function checkSqlReady({
  host,
  port,
  user,
  password,
  database,
  encrypt,
  trustServerCertificate,
  timeoutMs = 2500,
} = {}) {
  const env = resolveInfraEnv();
  const pool = new sql.ConnectionPool({
    server: host ?? env.dbHost,
    port: port ?? env.dbPort,
    user: user ?? env.dbUser,
    password: password ?? env.dbPass,
    database: database ?? env.dbName,
    connectionTimeout: timeoutMs,
    requestTimeout: timeoutMs,
    options: {
      encrypt: encrypt ?? env.dbEncrypt,
      trustServerCertificate:
        trustServerCertificate ?? env.dbTrustCert,
    },
  });

  try {
    await pool.connect();
    await pool.request().query('SELECT 1 AS ok');
    return { ready: true, reason: 'login ok' };
  } catch (error) {
    return { ready: false, reason: error.message };
  } finally {
    await pool.close().catch(() => undefined);
  }
}

export async function ensureDatabaseExists({
  host,
  port,
  user,
  password,
  database,
  encrypt,
  trustServerCertificate,
  timeoutMs = 5000,
} = {}) {
  const env = resolveInfraEnv();
  const targetDatabase = database ?? env.dbName;
  const pool = new sql.ConnectionPool({
    server: host ?? env.dbHost,
    port: port ?? env.dbPort,
    user: user ?? env.dbUser,
    password: password ?? env.dbPass,
    database: 'master',
    connectionTimeout: timeoutMs,
    requestTimeout: timeoutMs,
    options: {
      encrypt: encrypt ?? env.dbEncrypt,
      trustServerCertificate:
        trustServerCertificate ?? env.dbTrustCert,
    },
  });

  try {
    await pool.connect();
    const escapedDatabase = targetDatabase.replace(/]/g, ']]');
    const result = await pool
      .request()
      .input('dbName', sql.NVarChar(128), targetDatabase)
      .query(`
        SELECT DB_ID(@dbName) AS dbId;
        IF DB_ID(@dbName) IS NULL
        BEGIN
          EXEC('CREATE DATABASE [${escapedDatabase}]');
        END
      `);
    const dbId = result.recordsets?.[0]?.[0]?.dbId ?? null;
    return {
      created: dbId == null,
      database: targetDatabase,
    };
  } finally {
    await pool.close().catch(() => undefined);
  }
}

export async function checkElasticReady(nodeUrl, timeoutMs = 2500) {
  const controllerRoot = new AbortController();
  const rootTimer = setTimeout(() => controllerRoot.abort(), timeoutMs);
  try {
    const root = await fetch(nodeUrl, { signal: controllerRoot.signal });
    if (!root.ok) {
      return { ready: false, reason: `root status ${root.status}` };
    }
  } catch (error) {
    clearTimeout(rootTimer);
    return { ready: false, reason: error.message };
  } finally {
    clearTimeout(rootTimer);
  }

  const controllerHealth = new AbortController();
  const healthTimer = setTimeout(() => controllerHealth.abort(), timeoutMs);
  try {
    const health = await fetch(`${nodeUrl}/_cluster/health`, {
      signal: controllerHealth.signal,
    });
    if (!health.ok) {
      return { ready: false, reason: `health status ${health.status}` };
    }
    const body = await health.json();
    if (body?.status === 'green' || body?.status === 'yellow') {
      return { ready: true, reason: body.status };
    }
    return {
      ready: false,
      reason: `cluster status ${String(body?.status ?? 'unknown')}`,
    };
  } catch (error) {
    return { ready: false, reason: error.message };
  } finally {
    clearTimeout(healthTimer);
  }
}

export async function waitForDependency({
  label,
  checker,
  timeoutMs = 120000,
  intervalMs = 2000,
  logEveryMs = 10000,
}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastLogAt = 0;
  let lastResult = { ready: false, reason: 'not checked' };

  while (Date.now() - startedAt < timeoutMs) {
    attempts += 1;
    lastResult = await checker();
    if (lastResult.ready) {
      return {
        ...lastResult,
        attempts,
        durationMs: Date.now() - startedAt,
      };
    }

    const now = Date.now();
    if (now - lastLogAt >= logEveryMs) {
      lastLogAt = now;
      console.log(
        `[deps:wait] waiting for ${label}... attempt ${attempts} (${lastResult.reason})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return {
    ...lastResult,
    ready: false,
    attempts,
    durationMs: Date.now() - startedAt,
  };
}
