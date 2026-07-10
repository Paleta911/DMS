import process from 'node:process';
import {
  checkElasticReady,
  checkSqlReady,
  resolveInfraEnv,
} from './lib/infra-utils.mjs';

async function main() {
  // Pull effective infra coordinates from .env resolution helpers.
  const {
    dbHost,
    dbPort,
    dbUser,
    dbName,
    dbPass,
    dbEncrypt,
    dbTrustCert,
    esNode,
  } = resolveInfraEnv();

  const db = await checkSqlReady({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPass,
    database: dbName,
    encrypt: dbEncrypt,
    trustServerCertificate: dbTrustCert,
  });
  const es = await checkElasticReady(esNode, 2000);

  console.log(
    `[deps] DB ${dbHost}:${dbPort} (${dbUser}@${dbName}) -> ${
      db.ready ? 'UP' : `DOWN (${db.reason ?? 'unknown'})`
    }`,
  );
  console.log(
    `[deps] ES ${esNode} -> ${
      es.ready ? `UP (${es.reason})` : `DOWN (${es.reason ?? 'unknown'})`
    }`,
  );

  if (!db.ready) {
    console.log(
      '[deps] SQL Server no esta listo para login. Si usas Docker: npm run infra:up:db && npm run infra:wait:db',
    );
  }
  if (!es.ready) {
    console.log(
      '[deps] Elasticsearch no esta listo. Levantalo con: npm run infra:up:search && npm run infra:wait:search',
    );
  }
}

main().catch((error) => {
  console.error('[deps] check failed:', error);
  process.exitCode = 1;
});
