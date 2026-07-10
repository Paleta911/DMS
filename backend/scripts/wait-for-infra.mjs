import {
  checkElasticReady,
  checkSqlReady,
  resolveInfraEnv,
  waitForDependency,
} from './lib/infra-utils.mjs';

const args = new Set(process.argv.slice(2));
const env = resolveInfraEnv();
const timeoutMs = (() => {
  const explicit = [...args].find((value) => value.startsWith('--timeout='));
  if (!explicit) {
    return 120000;
  }
  const parsed = Number(explicit.split('=')[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 120000;
})();

const hasModeFlag = args.has('--db') || args.has('--search');
// Default behavior waits for DB; search is opt-in unless explicitly requested.
const waitDb = args.has('--db') || !hasModeFlag;
const waitSearch = args.has('--search');

async function main() {
  if (waitDb) {
    console.log(
      `[deps:wait] SQL ${env.dbHost}:${env.dbPort} user=${env.dbUser} db=${env.dbName}`,
    );
    const db = await waitForDependency({
      label: `sqlserver ${env.dbHost}:${env.dbPort}`,
      timeoutMs,
      checker: () =>
        checkSqlReady({
          host: env.dbHost,
          port: env.dbPort,
          user: env.dbUser,
          password: env.dbPass,
          database: env.dbName,
          encrypt: env.dbEncrypt,
          trustServerCertificate: env.dbTrustCert,
        }),
    });
    if (!db.ready) {
      throw new Error(
        `SQL Server not ready at ${env.dbHost}:${env.dbPort} after ${Math.round(
          db.durationMs / 1000,
        )}s (${db.reason})`,
      );
    }
    console.log(
      `[deps:wait] SQL ready in ${db.durationMs}ms (${db.reason}, attempts=${db.attempts})`,
    );
  }

  if (waitSearch) {
    console.log(`[deps:wait] Elasticsearch ${env.esNode}`);
    const es = await waitForDependency({
      label: `elasticsearch ${env.esNode}`,
      timeoutMs,
      checker: () => checkElasticReady(env.esNode, 2500),
    });
    if (!es.ready) {
      throw new Error(
        `Elasticsearch not ready at ${env.esNode} after ${Math.round(
          es.durationMs / 1000,
        )}s (${es.reason})`,
      );
    }
    console.log(
      `[deps:wait] Elasticsearch ready in ${es.durationMs}ms (${es.reason}, attempts=${es.attempts})`,
    );
  }
}

main().catch((error) => {
  console.error('[deps:wait] error:', error.message);
  process.exit(1);
});
