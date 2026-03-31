import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkElasticReady,
  checkSqlReady,
  resolveInfraEnv,
} from './lib/infra-utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(__dirname, '..', '..', 'frontend');

function runNpmScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn(`npm run ${scriptName}`, {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run ${scriptName} exited with code ${code ?? 1}`));
    });
  });
}

async function ensureDbAvailability() {
  const env = resolveInfraEnv();
  const sqlReady = await checkSqlReady({
    host: env.dbHost,
    port: env.dbPort,
    user: env.dbUser,
    password: env.dbPass,
    database: env.dbName,
    encrypt: env.dbEncrypt,
    trustServerCertificate: env.dbTrustCert,
    timeoutMs: 2500,
  });

  if (sqlReady.ready) {
    console.log(
      `[e2e:prepare] SQL ya disponible en ${env.dbHost}:${env.dbPort} (${sqlReady.reason})`,
    );
    return;
  }

  console.log(
    `[e2e:prepare] SQL no disponible en ${env.dbHost}:${env.dbPort}. Intentando levantar sqlserver por Docker Compose...`,
  );

  try {
    await runNpmScript('infra:up:db');
  } catch (error) {
    throw new Error(
      `No se pudo levantar SQL Server automaticamente. Abre Docker Desktop o inicia tu SQL local y reintenta. Detalle: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  await runNpmScript('infra:wait:db');
}

async function ensureSearchAvailability() {
  const env = resolveInfraEnv();
  const searchReady = await checkElasticReady(env.esNode, 2500);

  if (searchReady.ready) {
    console.log(
      `[e2e:prepare] Elasticsearch ya disponible en ${env.esNode} (${searchReady.reason})`,
    );
    return;
  }

  console.log(
    `[e2e:prepare] Elasticsearch no disponible en ${env.esNode}. Intentando levantar elasticsearch por Docker Compose...`,
  );

  try {
    await runNpmScript('infra:up:search');
  } catch (error) {
    throw new Error(
      `No se pudo levantar Elasticsearch automaticamente. Abre Docker Desktop o inicia tu nodo Elastic y reintenta. Detalle: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  await runNpmScript('infra:wait:search');
}

async function main() {
  await ensureDbAvailability();
  await ensureSearchAvailability();
  await runNpmScript('db:ensure');
  await runNpmScript('db:migration:run');
  await runNpmScript('db:seed');
  await runNpmScript('build');
  await new Promise((resolve, reject) => {
    const child = spawn('npm run build', {
      cwd: frontendDir,
      stdio: 'inherit',
      shell: true,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`npm run build (frontend) exited with code ${code ?? 1}`));
    });
  });
}

main().catch((error) => {
  console.error('[e2e:prepare] failed:', error.message);
  process.exit(1);
});
