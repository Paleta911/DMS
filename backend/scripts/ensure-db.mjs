import { ensureDatabaseExists, resolveInfraEnv } from './lib/infra-utils.mjs';

async function main() {
  const env = resolveInfraEnv();
  console.log(
    `[db:ensure] checking database ${env.dbName} on ${env.dbHost}:${env.dbPort}`,
  );
  const result = await ensureDatabaseExists({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPass,
    database: env.dbName,
    encrypt: env.dbEncrypt,
    trustServerCertificate: env.dbTrustCert,
  });
  console.log(
    `[db:ensure] ${result.created ? 'created' : 'already exists'}: ${result.database}`,
  );
}

main().catch((error) => {
  console.error('[db:ensure] error:', error.message);
  process.exit(1);
});
